package com.arena.win11

import android.app.Activity
import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.StatFs
import android.util.Base64
import android.util.DisplayMetrics
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader
import java.io.File

/** WebView без системной клавиатуры: ввод идёт через встроенную сенсорную клавиатуру приложения */
class NoImeWebView(context: Context) : WebView(context) {
    override fun onCheckIsTextEditor(): Boolean = false
}

class MainActivity : Activity() {

    private lateinit var webView: WebView

    // Корень общего хранилища
    private fun storageRoot(): String =
        Environment.getExternalStorageDirectory().absolutePath

    private fun resolvePhonePath(p: String): String? {
        if (!p.startsWith("phone:/")) return null
        val rel = p.removePrefix("phone:/").trim('/')
        if (rel.isEmpty()) return storageRoot()
        if (rel.contains("..")) return null
        return storageRoot() + "/" + rel
    }

    private fun jsonStr(s: String): String = s
        .replace("\\", "\\\\").replace("\"", "\\\"")
        .replace("\n", "\\n").replace("\r", "").replace("\t", "\\t")

    inner class Bridge {

        @JavascriptInterface
        fun hasStorage(): Boolean = true

        @JavascriptInterface
        fun getBattery(): String {
            return try {
                val i = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
                val level = i?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
                val scale = i?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
                val status = i?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
                val temp = (i?.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) ?: 0) / 10.0
                val pct = if (level >= 0 && scale > 0) level.toDouble() / scale else 0.86
                val charging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                        status == BatteryManager.BATTERY_STATUS_FULL
                """{"ok":true,"level":$pct,"charging":$charging,"temp":$temp}"""
            } catch (e: Exception) {
                """{"ok":false,"error":"${jsonStr(e.message ?: "?")}"}"""
            }
        }

        @JavascriptInterface
        fun getDeviceInfo(): String {
            return try {
                val mem = ActivityManager.MemoryInfo()
                (getSystemService(ACTIVITY_SERVICE) as ActivityManager).getMemoryInfo(mem)
                val stat = StatFs(Environment.getExternalStorageDirectory().path)
                val dm = DisplayMetrics()
                @Suppress("DEPRECATION")
                windowManager.defaultDisplay.getMetrics(dm)
                val abi = if (Build.SUPPORTED_ABIS.isNotEmpty()) Build.SUPPORTED_ABIS[0] else "unknown"
                val dpr = resources.displayMetrics.density
                """{"ok":true,
                    "model":"${jsonStr(Build.MODEL)}",
                    "manufacturer":"${jsonStr(Build.MANUFACTURER)}",
                    "brand":"${jsonStr(Build.BRAND)}",
                    "android":"${jsonStr(Build.VERSION.RELEASE)}",
                    "sdk":${Build.VERSION.SDK_INT},
                    "ramTotal":${mem.totalMem},
                    "ramAvail":${mem.availMem},
                    "cpuCores":${Runtime.getRuntime().availableProcessors()},
                    "abi":"${jsonStr(abi)}",
                    "screenW":${dm.widthPixels},
                    "screenH":${dm.heightPixels},
                    "density":$dpr,
                    "storageTotal":${stat.totalBytes},
                    "storageFree":${stat.availableBytes}
                }""".replace(Regex("\\s+"), " ")
            } catch (e: Exception) {
                """{"ok":false,"error":"${jsonStr(e.message ?: "?")}"}"""
            }
        }

        @JavascriptInterface
        fun listFiles(phonePath: String): String {
            return try {
                val dir = File(resolvePhonePath(phonePath) ?: return """{"ok":false,"error":"bad-path"}""")
                if (!dir.exists() || !dir.isDirectory) return """{"ok":false,"error":"not-found"}"""
                val files = dir.listFiles()
                    ?: return """{"ok":false,"error":"permission"}"""
                val root = storageRoot()
                val sorted = files.sortedWith(
                    compareByDescending<File> { it.isDirectory }.thenBy { it.name.lowercase() }
                ).take(500)
                val items = sorted.joinToString(",") { f ->
                    val full = f.absolutePath
                    val jp = if (full == root) "phone:/" else "phone:/" + full.removePrefix(root).trimStart('/')
                    """{"n":"${jsonStr(f.name)}","d":${f.isDirectory},"p":"${jsonStr(jp)}","s":${if (f.isFile) f.length() else 0}}"""
                }
                """{"ok":true,"items":[$items]}"""
            } catch (e: Exception) {
                """{"ok":false,"error":"${jsonStr(e.message ?: "?")}"}"""
            }
        }

        @JavascriptInterface
        fun readFileB64(phonePath: String): String {
            return try {
                val f = File(resolvePhonePath(phonePath) ?: return """{"ok":false,"error":"bad-path"}""")
                if (!f.exists() || f.length() > 6_000_000) return """{"ok":false,"error":"too-large"}"""
                val bytes = f.readBytes()
                val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                """{"ok":true,"b64":"$b64","mime":"${mimeOf(f.name)}"}"""
            } catch (e: Exception) {
                """{"ok":false,"error":"${jsonStr(e.message ?: "?")}"}"""
            }
        }

        @JavascriptInterface
        fun readThumb(phonePath: String): String {
            return try {
                val f = File(resolvePhonePath(phonePath) ?: return """{"ok":false,"error":"bad-path"}""")
                if (!f.exists()) return """{"ok":false,"error":"not-found"}"""
                val bounds = android.graphics.BitmapFactory.Options().apply { inJustDecodeBounds = true }
                android.graphics.BitmapFactory.decodeFile(f.absolutePath, bounds)
                if (bounds.outWidth <= 0) return """{"ok":false,"error":"not-image"}"""
                var sample = 1
                while (bounds.outWidth / sample > 320 || bounds.outHeight / sample > 320) sample *= 2
                val opts = android.graphics.BitmapFactory.Options().apply { inSampleSize = sample }
                val bmp = android.graphics.BitmapFactory.decodeFile(f.absolutePath, opts)
                    ?: return """{"ok":false,"error":"decode"}"""
                val bos = ByteArrayOutputStream()
                bmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 72, bos)
                bmp.recycle()
                """{"ok":true,"b64":"${Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP)}","mime":"image/jpeg"}"""
            } catch (e: Exception) {
                """{"ok":false,"error":"${jsonStr(e.message ?: "?")}"}"""
            }
        }

        @JavascriptInterface
        fun readText(phonePath: String): String {
            return try {
                val f = File(resolvePhonePath(phonePath) ?: return """{"ok":false,"error":"bad-path"}""")
                if (!f.exists() || f.length() > 500_000) return """{"ok":false,"error":"too-large"}"""
                val text = f.readText(Charsets.UTF_8)
                """{"ok":true,"text":"${jsonStr(text)}"}"""
            } catch (e: Exception) {
                """{"ok":false,"error":"${jsonStr(e.message ?: "?")}"}"""
            }
        }

        private fun mimeOf(name: String): String {
            val ext = name.substringAfterLast('.', "").lowercase()
            return when (ext) {
                "jpg", "jpeg" -> "image/jpeg"
                "png" -> "image/png"
                "gif" -> "image/gif"
                "webp" -> "image/webp"
                "bmp" -> "image/bmp"
                "mp3" -> "audio/mpeg"
                "wav" -> "audio/wav"
                "ogg" -> "audio/ogg"
                "mp4" -> "video/mp4"
                "pdf" -> "application/pdf"
                else -> "application/octet-stream"
            }
        }
    }

    @Suppress("SetJavaScriptEnabled", "DEPRECATION")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        webView = NoImeWebView(this)
        setContentView(webView)
        webView.setBackgroundColor(Color.parseColor("#0A0F1C"))

        val s = webView.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.databaseEnabled = true
        // Ресурсы локальные — читаем всегда свежие, чтобы не подмешивался кэш прошлых версий
        s.cacheMode = WebSettings.LOAD_NO_CACHE
        s.mediaPlaybackRequiresUserGesture = false
        s.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        s.allowFileAccess = false
        s.allowContentAccess = false

        webView.addJavascriptInterface(Bridge(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url
                if (url.host == "appassets.androidplatform.net") return false
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    true
                } catch (_: Exception) {
                    true
                }
            }
        }
        webView.webChromeClient = WebChromeClient()

        requestStoragePermissions()
        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    private fun requestStoragePermissions() {
        val perms = if (Build.VERSION.SDK_INT >= 33) arrayOf(
            "android.permission.READ_MEDIA_IMAGES",
            "android.permission.READ_MEDIA_VIDEO",
            "android.permission.READ_MEDIA_AUDIO"
        ) else arrayOf(
            "android.permission.READ_EXTERNAL_STORAGE"
        )
        val missing = perms.filter {
            checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            try { requestPermissions(missing.toTypedArray(), 42) } catch (_: Exception) {}
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
