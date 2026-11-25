package com.arena.bedrock

import android.app.Activity
import android.app.AlertDialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import android.text.InputType
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors
import java.util.zip.ZipFile

/** Independent native Bedrock companion. Always hands game commands to the official package. */
class MainActivity : Activity() {
    private val mint = Color.rgb(101, 228, 174)
    private val white = Color.rgb(233, 244, 239)
    private val muted = Color.rgb(151, 175, 169)
    private val bgColor = Color.rgb(12, 21, 23)
    private lateinit var page: LinearLayout
    private lateinit var status: TextView
    private val prefs by lazy { getSharedPreferences("bedrock", MODE_PRIVATE) }
    private val worker = Executors.newSingleThreadExecutor()
    @Volatile private var alive = true
    @Volatile private var importing = false
    private var tab = "home"
    private var message = ""
    private var servers = mutableListOf<BedrockServer>()
    private val importsDir get() = File(cacheDir, "imports").apply { mkdirs() }

    private fun dp(n: Int) = (n * resources.displayMetrics.density).toInt()
    private fun shape(color: Int, radius: Int = 18) = GradientDrawable().apply {
        setColor(color); cornerRadius = dp(radius).toFloat()
    }
    private fun label(parent: LinearLayout, text: String, size: Float = 15f, color: Int = white): TextView = TextView(this).apply {
        this.text = text; textSize = size; setTextColor(color)
        setPadding(0, dp(7), 0, dp(7))
        parent.addView(this)
    }
    private fun button(parent: LinearLayout, text: String, id: String, primary: Boolean = false, action: () -> Unit): Button = Button(this).apply {
        this.text = text; contentDescription = id; isAllCaps = false
        textSize = 16f
        setTextColor(if (primary) bgColor else white)
        background = shape(if (primary) mint else Color.rgb(35, 53, 54), 12)
        minHeight = dp(50)
        parent.addView(this, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(8); bottomMargin = dp(4) })
        setOnClickListener { action() }
    }
    private fun card(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(18), dp(13), dp(18), dp(16))
        background = shape(Color.rgb(23, 37, 40))
        page.addView(this, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(14) })
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        tab = state?.getString("tab") ?: "home"
        message = state?.getString("message") ?: ""
        loadServers()
        render()
    }
    override fun onResume() {
        super.onResume()
        if (::page.isInitialized) render()
    }
    override fun onSaveInstanceState(out: Bundle) {
        out.putString("tab", tab); out.putString("message", message)
        super.onSaveInstanceState(out)
    }

    private fun installed(): String? = try {
        @Suppress("DEPRECATION")
        packageManager.getPackageInfo(MINECRAFT_PACKAGE, 0).versionName ?: "установлен"
    } catch (_: Exception) { null }

    private fun render() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(12), dp(20), dp(12))
            setBackgroundColor(bgColor)
        }
        label(root, "B / BEDROCK LAUNCHER", 13f, mint).typeface = Typeface.DEFAULT_BOLD
        val nav = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        root.addView(nav)
        listOf("home" to "Играть", "servers" to "Серверы", "imports" to "Импорт").forEach { (id, name) ->
            val b = Button(this).apply {
                text = name; isAllCaps = false; textSize = 13f; contentDescription = "tab_$id"
                setTextColor(if (id == tab) mint else muted)
                background = shape(if (id == tab) Color.rgb(29, 52, 47) else bgColor, 10)
                setOnClickListener { tab = id; render() }
            }
            nav.addView(b, LinearLayout.LayoutParams(0, dp(46), 1f))
        }
        val scroll = ScrollView(this).apply { isFillViewport = true }
        root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
        page = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        scroll.addView(page)
        when (tab) {
            "servers" -> serverPage()
            "imports" -> importPage()
            else -> homePage()
        }
        status = label(root, message, 12f, mint).apply {
            contentDescription = "status"
            maxLines = 4
            setTextIsSelectable(true)
        }
        label(root, "Неофициальный лаунчер · Minecraft устанавливается отдельно", 11f, muted)
        setContentView(root)
    }

    private fun homePage() {
        label(page, "Твой мир.\nТвой маршрут.", 31f).typeface = Typeface.DEFAULT_BOLD
        label(page, "Bedrock Edition · Android", 14f, mint)
        val game = card()
        val version = installed()
        label(game, if (version != null) "● Minecraft найден" else "○ Minecraft не установлен", 18f)
        label(game, if (version != null) "Версия $version" else "Установи официальную игру, затем вернись сюда.", 14f, muted)
        button(game, "Играть в Bedrock", "play", true) { launchGame() }
        if (version == null) button(game, "Открыть Google Play", "open_store") { openStore() }
        val info = card()
        label(info, "Один центр для твоей игры", 18f)
        label(info, "Сохраняй адреса серверов и передавай миры, паки и аддоны в Minecraft.", 14f, muted)
        label(info, "По кнопке «Играть» откроется установленное приложение Minecraft Bedrock. Это согласованный вариант: движок игры не встроен в лаунчер.", 14f, muted)
        button(info, "О приложении и диагностика", "about") { about() }
    }

    private fun missingGame() {
        setStatus("Minecraft Bedrock не найден. Установи игру отдельно.")
        AlertDialog.Builder(this).setTitle("Нужен Minecraft Bedrock")
            .setMessage("Этот APK — лаунчер, а не копия игры. Для запуска, серверов и импорта нужен установленный Minecraft для Android.")
            .setPositiveButton("Google Play") { _, _ -> openStore() }
            .setNegativeButton("Закрыть", null).show()
    }
    private fun launchGame() {
        val intent = packageManager.getLaunchIntentForPackage(MINECRAFT_PACKAGE)
        if (intent == null) { missingGame(); return }
        dispatch(intent, "Minecraft открыт")
    }
    private fun dispatch(intent: Intent, success: String) {
        try { startActivity(intent); setStatus(success) }
        catch (e: Exception) { setStatus("Не удалось открыть Minecraft: ${e.javaClass.simpleName}") }
    }
    private fun openStore() {
        // Use HTTPS so this also works without the Play Store application.
        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$MINECRAFT_PACKAGE"))) }
        catch (_: Exception) { setStatus("Нет приложения для открытия магазина. Установи Minecraft из доверенного источника.") }
    }
    private fun setStatus(value: String) {
        message = value
        if (alive && ::status.isInitialized) status.text = value
    }

    private fun loadServers() {
        try {
            val array = JSONArray(prefs.getString("servers", "[]"))
            servers = (0 until array.length()).map { i ->
                val o = array.getJSONObject(i)
                BedrockServer.create(o.getString("name"), o.getString("host"), o.getInt("port").toString(), o.getString("id"))
            }.toMutableList()
        } catch (_: Exception) {
            // Do not overwrite damaged saved data automatically.
            servers = mutableListOf()
            message = "Не удалось прочитать список серверов. Скопируй диагностику перед добавлением новых."
        }
    }
    private fun saveServers() {
        val array = JSONArray()
        servers.forEach { array.put(JSONObject().put("id", it.id).put("name", it.name).put("host", it.host).put("port", it.port)) }
        prefs.edit().putString("servers", array.toString()).apply()
    }
    private fun serverPage() {
        label(page, "Твои серверы", 29f).typeface = Typeface.DEFAULT_BOLD
        label(page, "Адреса хранятся только на телефоне. Статус и доступность серверов не проверяются.", 14f, muted)
        button(page, "+ Добавить сервер", "add_server", true) { editServer(null) }
        if (servers.isEmpty()) label(page, "Пока пусто. Добавь первый сервер по адресу и порту.", 16f, muted)
        servers.forEach { server ->
            val box = card()
            label(box, server.name, 20f)
            label(box, "${server.host} : ${server.port}", 14f, muted)
            button(box, "Добавить в Minecraft", "connect_${server.id}", true) {
                if (installed() == null) { missingGame(); return@button }
                val uri = Uri.Builder().scheme("minecraft").encodedAuthority("")
                    .appendQueryParameter("addExternalServer", server.externalServerValue).build()
                dispatch(Intent(Intent.ACTION_VIEW, uri).setPackage(MINECRAFT_PACKAGE),
                    "Адрес передан Minecraft. Подтверди добавление и подключись в игре.")
            }
            button(box, "Изменить", "edit_${server.id}") { editServer(server) }
            button(box, "Удалить", "delete_${server.id}") {
                AlertDialog.Builder(this).setTitle("Удалить ${server.name}?")
                    .setMessage("Удалится только запись в этом лаунчере, не в Minecraft.")
                    .setPositiveButton("Удалить") { _, _ -> servers.removeAll { it.id == server.id }; saveServers(); render() }
                    .setNegativeButton("Отмена", null).show()
            }
        }
    }
    private fun editServer(existing: BedrockServer?) {
        val form = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(22), dp(8), dp(22), dp(4)) }
        fun field(hint: String, value: String, id: String, type: Int): EditText = EditText(this).apply {
            this.hint = hint; setText(value); contentDescription = id; inputType = type; setSingleLine(true)
            form.addView(this)
        }
        val name = field("Название", existing?.name ?: "", "server_name", InputType.TYPE_CLASS_TEXT)
        val host = field("Адрес без порта", existing?.host ?: "", "server_host", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI)
        val port = field("Порт", existing?.port?.toString() ?: "19132", "server_port", InputType.TYPE_CLASS_NUMBER)
        val error = label(form, "", 13f, Color.rgb(255, 155, 139))
        val dialog = AlertDialog.Builder(this).setTitle(if (existing == null) "Новый сервер" else "Изменить сервер")
            .setView(form).setPositiveButton("Сохранить", null).setNegativeButton("Отмена", null).create()
        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).apply {
                contentDescription = "save_server"
                setOnClickListener {
                    try {
                        val server = BedrockServer.create(name.text.toString(), host.text.toString(), port.text.toString(), existing?.id ?: UUID.randomUUID().toString())
                        if (existing == null) servers.add(server) else servers[servers.indexOfFirst { it.id == existing.id }] = server
                        saveServers(); dialog.dismiss(); render()
                    } catch (e: IllegalArgumentException) { error.text = e.message ?: "Некорректный адрес" }
                }
            }
        }
        dialog.show()
    }

    private fun importPage() {
        label(page, "Добавь своё", 29f).typeface = Typeface.DEFAULT_BOLD
        label(page, "Миры, текстуры и аддоны", 15f, mint)
        val box = card()
        label(box, ".mcworld  /  .mcpack  /  .mcaddon", 17f)
        label(box, "Выбери архив на телефоне. Лаунчер проверит формат ZIP и передаст копию Minecraft, где нужно дождаться результата импорта.", 14f, muted)
        button(box, if (importing) "Подготовка файла…" else "Выбрать файл", "choose_file", true) { chooseImport() }.isEnabled = !importing
        label(box, "До 512 МБ. Используется системный выбор файла — доступ ко всему хранилищу не нужен. Файл временно копируется в кеш.", 13f, muted)
        label(box, "Импортируй только доверенные файлы. Совместимость с версией игры и успешный импорт определяет сам Minecraft.", 13f, muted)
    }
    private fun chooseImport() {
        if (importing) return
        if (installed() == null) { missingGame(); return }
        try {
            startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                type = "*/*"; addCategory(Intent.CATEGORY_OPENABLE)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }, 101)
        } catch (_: Exception) { setStatus("На телефоне нет системного приложения выбора файлов") }
    }
    @Deprecated("Platform activity result API used to avoid an unnecessary UI dependency")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 101 || resultCode != RESULT_OK) return
        val uri = data?.data ?: return
        if (importing) return
        importing = true
        setStatus("Подготовка файла…")
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        render()
        worker.execute {
            var part: File? = null
            var ready: File? = null
            try {
                var displayName = ""
                contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) displayName = cursor.getString(0) ?: ""
                }
                val safeName = ImportFiles.safeName(displayName)
                val target = File(importsDir, "${UUID.randomUUID()}-$safeName")
                val temporary = File(importsDir, target.name + ".part")
                part = temporary
                var count = 0L
                val input = contentResolver.openInputStream(uri) ?: error("Не удалось прочитать выбранный файл")
                input.use { source ->
                    temporary.outputStream().use { output ->
                        val buffer = ByteArray(65536)
                        while (true) {
                            check(alive && !Thread.currentThread().isInterrupted) { "Импорт отменён" }
                            val n = source.read(buffer)
                            if (n < 0) break
                            count += n
                            require(count <= ImportFiles.MAX_BYTES) { "Файл больше 512 МБ" }
                            check(importsDir.usableSpace > n + 8L * 1024 * 1024) { "Недостаточно свободного места" }
                            output.write(buffer, 0, n)
                        }
                    }
                }
                ZipFile(temporary).use { require(it.entries().hasMoreElements()) { "Архив пуст" } }
                check(temporary.renameTo(target)) { "Не удалось сохранить временную копию" }
                ready = target
                // Keep recent imports so Minecraft can finish reading after the hand-off.
                importsDir.listFiles()?.filter { it.isFile && it != target && System.currentTimeMillis() - it.lastModified() > 7L * 86400000 }
                    ?.forEach { it.delete() }
                runOnUiThread {
                    if (alive && !isFinishing) {
                        importing = false; window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        render(); sendImport(target, safeName)
                    }
                }
            } catch (e: Exception) {
                ready?.delete()
                runOnUiThread {
                    if (alive && !isFinishing) {
                        importing = false; window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                        setStatus("Ошибка импорта: ${e.message ?: e.javaClass.simpleName}"); render()
                    }
                }
            } finally { part?.delete() }
        }
    }
    private fun sendImport(file: File, name: String) {
        if (installed() == null) { missingGame(); return }
        try {
            val uri = FileProvider.getUriForFile(this, "$packageName.imports", file)
            val intent = Intent(Intent.ACTION_VIEW).setDataAndType(uri, ImportFiles.mime(name))
                .setPackage(MINECRAFT_PACKAGE).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION).apply {
                    clipData = ClipData.newRawUri("Bedrock import", uri)
                }
            // Some Minecraft versions advertise only the generic binary MIME type.
            if (intent.resolveActivity(packageManager) == null) intent.setDataAndType(uri, "application/octet-stream")
            dispatch(intent, "Файл передан Minecraft. Дождись сообщения об импорте в игре.")
        } catch (e: Exception) { setStatus("Не удалось передать файл Minecraft: ${e.javaClass.simpleName}") }
    }
    private fun about() {
        val report = "Bedrock Launcher 1.0\nAndroid ${android.os.Build.VERSION.RELEASE}\nABI: ${android.os.Build.SUPPORTED_ABIS.joinToString()}\nMinecraft: ${installed() ?: "не установлен"}\nСтатус: $message"
        AlertDialog.Builder(this).setTitle("Bedrock Launcher · 1.0")
            .setMessage("Новый нативный Android-проект. Без Java/Pojav и Windows-оболочки.\n\nЛаунчер открывает установленный Minecraft Bedrock и не содержит его код, лицензию или аккаунты. Не связан с Mojang или Microsoft.\n\n$report")
            .setPositiveButton("Скопировать диагностику") { _, _ ->
                (getSystemService(CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("Bedrock diagnostics", report))
                setStatus("Диагностика скопирована")
            }.setNegativeButton("Закрыть", null).show()
    }
    override fun onDestroy() {
        alive = false; worker.shutdownNow()
        super.onDestroy()
    }
}
