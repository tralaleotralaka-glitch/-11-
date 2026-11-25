package com.arena.win11

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.widget.*
import org.json.JSONObject
import java.io.File
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors

/** Own native launcher foundation. Does not pretend that a desktop JVM runs on Android. */
class JavaLauncherActivity : Activity() {
    private val worker = Executors.newSingleThreadExecutor()
    private lateinit var versions: Spinner
    private lateinit var status: TextView
    private lateinit var download: Button
    private lateinit var refresh: Button
    private var entries = listOf<JSONObject>()
    private var alive = true
    private val green = Color.rgb(121, 211, 134)

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val density = resources.displayMetrics.density
        fun dp(n: Int) = (n * density).toInt()
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(24), dp(24), dp(24))
            setBackgroundColor(Color.rgb(17, 23, 25))
        }
        fun label(text: String, size: Float, color: Int = Color.WHITE): TextView {
            return TextView(this).apply {
                this.text = text
                textSize = size
                setTextColor(color)
                setPadding(0, dp(8), 0, dp(8))
                root.addView(this)
            }
        }
        label("JAVA LAUNCHER", 13f, green)
        label("Minecraft: Java Edition", 28f)
        label("Собственный лаунчер · прототип 0.2", 15f)
        label("Это не Bedrock и не игра-имитация. Сейчас доступны каталог версий Mojang и загрузка клиента. Запуск игры ещё не реализован.", 16f)
        label("Локальный профиль · без входа Microsoft", 18f, green)
        val prefs = getSharedPreferences("launcher_profile", MODE_PRIVATE)
        val nickname = EditText(this).apply {
            hint = "Ник игрока"
            setTextColor(Color.WHITE)
            setHintTextColor(Color.LTGRAY)
            setSingleLine(true)
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
            filters = arrayOf(android.text.InputFilter.LengthFilter(16))
            setText(prefs.getString("offline_name", "Player"))
        }
        root.addView(nickname)
        val profileInfo = label("", 13f)
        fun showProfile(profile: OfflineProfile) {
            profileInfo.text = "Локальный ник: ${profile.name}\nОфлайн-UUID: ${profile.uuid}\nЭто не авторизованный аккаунт Minecraft."
        }
        try { showProfile(OfflineProfile.create(nickname.text.toString())) } catch (_: IllegalArgumentException) {
            profileInfo.text = "Введите ник и сохраните профиль."
        }
        val saveProfile = Button(this).apply { text = "Сохранить локальный профиль" }
        root.addView(saveProfile)
        saveProfile.setOnClickListener {
            try {
                val profile = OfflineProfile.create(nickname.text.toString())
                prefs.edit().putString("offline_name", profile.name).apply()
                nickname.error = null
                showProfile(profile)
            } catch (e: IllegalArgumentException) {
                nickname.error = e.message
            }
        }
        label("Локальный профиль не выдаёт лицензию, не заменяет вход на серверы с проверкой аккаунта и пока не подключён к запуску игры.", 13f)
        label("Версия игры", 16f, green)
        versions = Spinner(this)
        root.addView(versions)
        refresh = Button(this).apply { text = "Обновить список версий" }
        root.addView(refresh)
        download = Button(this).apply { text = "Скачать клиент выбранной версии"; isEnabled = false }
        root.addView(download)
        status = label("Подключение к каталогу…", 15f)
        label("Что ещё нужно для игры", 19f, green)
        label("• Вход Microsoft с лицензией Minecraft\n• Java runtime для Android\n• Нативный графический слой и ввод\n• Библиотеки, ресурсы и запуск игрового процесса", 15f)
        label("Файлы хранятся в закрытой папке приложения. Удаление приложения удалит загруженные файлы. Прототип не связан с Mojang или Microsoft.", 12f)
        val scroll = ScrollView(this).apply { addView(root) }
        setContentView(scroll)
        refresh.setOnClickListener { loadVersions() }
        download.setOnClickListener { downloadSelected() }
        loadVersions()
    }

    private fun ui(action: () -> Unit) {
        runOnUiThread { if (alive && !isFinishing) action() }
    }

    private fun busy(value: Boolean) {
        refresh.isEnabled = !value
        download.isEnabled = !value && entries.isNotEmpty()
        versions.isEnabled = !value
    }

    // Only official metadata / content endpoints. No arbitrary URLs from a text field.
    private fun connection(address: String): java.net.HttpURLConnection {
        val url = URL(address)
        require(url.protocol == "https" && url.host in setOf(
            "piston-meta.mojang.com", "piston-data.mojang.com",
            "launchermeta.mojang.com", "launcher.mojang.com"
        )) { "Недопустимый адрес загрузки" }
        return (url.openConnection() as java.net.HttpURLConnection).apply {
            connectTimeout = 15000
            readTimeout = 30000
            instanceFollowRedirects = false
            setRequestProperty("User-Agent", "ArenaJavaLauncher/0.1")
        }
    }

    private fun fetch(address: String, target: File, expectedHash: String? = null, expectedSize: Long? = null) {
        val conn = connection(address)
        val temp = File(target.parentFile, target.name + ".part")
        try {
            check(conn.responseCode == 200) { "HTTP ${conn.responseCode}" }
            val digest = MessageDigest.getInstance("SHA-1")
            var total = 0L
            var nextUpdate = 0L
            conn.inputStream.use { input ->
                temp.outputStream().use { output ->
                    val buffer = ByteArray(65536)
                    while (true) {
                        check(!Thread.currentThread().isInterrupted) { "Загрузка отменена" }
                        val count = input.read(buffer)
                        if (count < 0) break
                        total += count
                        check(total <= (expectedSize ?: 16_777_216L)) { "Превышен размер файла" }
                        digest.update(buffer, 0, count)
                        output.write(buffer, 0, count)
                        if (expectedSize != null && total >= nextUpdate) {
                            nextUpdate = total + 1_048_576
                            ui { status.text = "Клиент: ${total / 1_048_576} / ${expectedSize / 1_048_576} МБ" }
                        }
                    }
                }
            }
            check(expectedSize == null || total == expectedSize) { "Файл загружен не полностью" }
            val actual = digest.digest().joinToString("") { "%02x".format(it.toInt() and 255) }
            check(expectedHash == null || actual.equals(expectedHash, true)) { "Проверка SHA-1 не пройдена" }
            check(temp.renameTo(target)) { "Не удалось сохранить файл" }
        } finally {
            conn.disconnect()
            temp.delete()
        }
    }

    private fun loadVersions() {
        busy(true)
        status.text = "Загрузка официального каталога Mojang…"
        worker.execute {
            try {
                val catalog = File(filesDir, "version_manifest_v2.json")
                fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json", catalog)
                val array = JSONObject(catalog.readText()).getJSONArray("versions")
                val releases = (0 until array.length()).map { array.getJSONObject(it) }
                    .filter { it.getString("type") == "release" }
                check(releases.isNotEmpty()) { "Каталог не содержит релизов" }
                ui {
                    entries = releases
                    versions.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item,
                        releases.map { it.getString("id") })
                    status.text = "Доступно ${releases.size} релизов. Загрузка клиента не означает готовность к игре."
                    busy(false)
                }
            } catch (e: Exception) {
                ui { status.text = "Не удалось получить каталог: ${e.message}. Проверьте интернет и повторите."; busy(false) }
            }
        }
    }

    private fun downloadSelected() {
        val selected = entries.getOrNull(versions.selectedItemPosition) ?: return
        busy(true)
        status.text = "Получение описания версии…"
        worker.execute {
            try {
                val id = selected.getString("id")
                require(id.matches(Regex("[a-zA-Z0-9._-]+"))) { "Недопустимая версия" }
                val dir = File(filesDir, "minecraft/versions/$id").apply { mkdirs() }
                val meta = File(dir, "$id.json")
                fetch(selected.getString("url"), meta, selected.getString("sha1"))
                val data = JSONObject(meta.readText())
                val client = data.getJSONObject("downloads").getJSONObject("client")
                fetch(client.getString("url"), File(dir, "$id.jar"), client.getString("sha1"), client.getLong("size"))
                val java = data.optJSONObject("javaVersion")?.optInt("majorVersion", 8) ?: 8
                ui {
                    status.text = "Клиент $id скачан, SHA-1 проверен. Требуется Java $java. Это только клиент: библиотеки, ресурсы, авторизация и запуск пока не реализованы."
                    busy(false)
                }
            } catch (e: Exception) {
                ui { status.text = "Ошибка загрузки: ${e.message}. Можно повторить."; busy(false) }
            }
        }
    }

    override fun onDestroy() {
        alive = false
        worker.shutdownNow()
        super.onDestroy()
    }
}
