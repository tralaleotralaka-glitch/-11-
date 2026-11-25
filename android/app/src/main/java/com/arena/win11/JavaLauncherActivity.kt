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
    private lateinit var extraFiles: CheckBox
    private lateinit var cancel: Button
    @Volatile private var cancelled = false
    private var stage = ""
    private val logLock = Any()
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
        label("Собственный лаунчер · прототип 0.3", 15f)
        label("Это не Bedrock и не игра-имитация. Сейчас доступны каталог, клиент, Java-библиотеки и ресурсы. Запуск игры ещё не реализован.", 16f)
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
        extraFiles = CheckBox(this).apply {
            text = "Также скачать Java-библиотеки и ресурсы (возможны гигабайты)"
            setTextColor(Color.WHITE)
            isChecked = prefs.getBoolean("extra_files", false)
            setOnCheckedChangeListener { _, checked -> prefs.edit().putBoolean("extra_files", checked).apply() }
        }
        root.addView(extraFiles)
        download = Button(this).apply { text = "Скачать клиент выбранной версии"; isEnabled = false }
        root.addView(download)
        cancel = Button(this).apply { text = "Отменить загрузку"; isEnabled = false }
        root.addView(cancel)
        cancel.setOnClickListener {
            cancelled = true
            cancel.isEnabled = false
            status.text = "Отмена запрошена; ожидание завершения сетевого чтения (до 30 секунд)…"
        }
        status = label("Подключение к каталогу…", 15f)
        val copyLog = Button(this).apply { text = "Скопировать диагностику" }
        root.addView(copyLog)
        copyLog.setOnClickListener {
            val report = synchronized(logLock) { runCatching { logFile().readText() }.getOrDefault("Журнал недоступен") }
            val info = "Java Launcher 0.3-prototype\nAndroid ${android.os.Build.VERSION.RELEASE}; ABI ${android.os.Build.SUPPORTED_ABIS.joinToString()}\n${status.text}\n$report"
            (getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager)
                .setPrimaryClip(android.content.ClipData.newPlainText("Launcher diagnostics", info))
            Toast.makeText(this, "Диагностика скопирована", Toast.LENGTH_SHORT).show()
        }
        label("Что ещё нужно для игры", 19f, green)
        label("• Вход Microsoft с лицензией Minecraft\n• Java runtime для Android\n• Нативный графический слой и ввод\n• Android-совместимые native-библиотеки и запуск игрового процесса", 15f)
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

    private fun logFile() = File(filesDir, "launcher.log")

    private fun record(message: String) {
        synchronized(logLock) {
            // Diagnostics must not break recovery when storage is full.
            runCatching {
                val file = logFile()
                if (file.length() > 131072) file.writeText("[Журнал сокращён]\n")
                file.appendText("${java.util.Date()}: $message\n")
            }
        }
    }

    private fun checkCancelled() {
        check(!cancelled && !Thread.currentThread().isInterrupted) { "Загрузка отменена" }
    }

    private fun busy(value: Boolean) {
        if (value) cancelled = false
        cancel.isEnabled = value
        extraFiles.isEnabled = !value
        if (value) window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        refresh.isEnabled = !value
        download.isEnabled = !value && entries.isNotEmpty()
        versions.isEnabled = !value
    }

    // Only official metadata / content endpoints. No arbitrary URLs from a text field.
    private fun connection(address: String): java.net.HttpURLConnection {
        val url = URL(address)
        require(url.protocol == "https" && url.host in setOf(
            "piston-meta.mojang.com", "piston-data.mojang.com",
            "launchermeta.mojang.com", "launcher.mojang.com",
            "libraries.minecraft.net", "resources.download.minecraft.net"
        )) { "Недопустимый адрес загрузки" }
        return (url.openConnection() as java.net.HttpURLConnection).apply {
            connectTimeout = 15000
            readTimeout = 30000
            instanceFollowRedirects = false
            setRequestProperty("User-Agent", "ArenaJavaLauncher/0.3")
        }
    }

    private fun fetch(address: String, target: File, expectedHash: String? = null, expectedSize: Long? = null) {
        checkCancelled()
        require(expectedSize == null || expectedSize in 0..2_147_483_648L) { "Недопустимый размер" }
        require(expectedHash == null || expectedHash.matches(Regex("[a-fA-F0-9]{40}"))) { "Недопустимый SHA-1" }
        if (expectedHash != null && GameFiles.verified(target, expectedHash, expectedSize) { cancelled }) return
        if (expectedSize != null) check(target.parentFile!!.let { parent ->
            parent.mkdirs()
            parent.usableSpace > expectedSize + 32L * 1024 * 1024
        }) { "Недостаточно свободного места" }
        check(target.parentFile!!.isDirectory || target.parentFile!!.mkdirs()) { "Не удалось создать каталог" }
        record("GET $address")
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
                        checkCancelled()
                        val count = input.read(buffer)
                        if (count < 0) break
                        total += count
                        check(total <= (expectedSize ?: 16_777_216L)) { "Превышен размер файла" }
                        digest.update(buffer, 0, count)
                        output.write(buffer, 0, count)
                        if (expectedSize != null && expectedSize >= 1_048_576 && total >= nextUpdate) {
                            nextUpdate = total + 1_048_576
                            val message = "$stage: ${total / 1_048_576} / ${expectedSize / 1_048_576} МБ"
                            ui { if (!cancelled) status.text = message }
                        }
                    }
                }
            }
            check(expectedSize == null || total == expectedSize) { "Файл загружен не полностью" }
            val actual = digest.digest().joinToString("") { "%02x".format(it.toInt() and 255) }
            check(expectedHash == null || actual.equals(expectedHash, true)) { "Проверка SHA-1 не пройдена" }
            checkCancelled()
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
                var cached = false
                try {
                    fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json", catalog)
                } catch (e: Exception) {
                    checkCancelled()
                    if (!catalog.isFile) throw e
                    cached = true
                    record("Каталог из кеша: ${e.message}")
                }
                val array = JSONObject(catalog.readText()).getJSONArray("versions")
                val releases = (0 until array.length()).map { array.getJSONObject(it) }
                    .filter { it.getString("type") == "release" }
                check(releases.isNotEmpty()) { "Каталог не содержит релизов" }
                checkCancelled()
                ui {
                    entries = releases
                    versions.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item,
                        releases.map { it.getString("id") })
                    val saved = getSharedPreferences("launcher_profile", MODE_PRIVATE).getString("version_id", "")
                    val index = releases.indexOfFirst { it.getString("id") == saved }
                    if (index >= 0) versions.setSelection(index)
                    status.text = "${if (cached) "Кешированный каталог. " else ""}Доступно ${releases.size} релизов. Запуск игры пока недоступен."
                    busy(false)
                }
            } catch (e: Exception) {
                record("Ошибка каталога: ${e.stackTraceToString()}")
                ui { status.text = if (cancelled) "Загрузка отменена" else "Не удалось получить каталог: ${e.message}. Повторите или скопируйте диагностику."; busy(false) }
            }
        }
    }

    private fun downloadSelected() {
        val selected = entries.getOrNull(versions.selectedItemPosition) ?: return
        val includeFiles = extraFiles.isChecked
        getSharedPreferences("launcher_profile", MODE_PRIVATE).edit()
            .putString("version_id", selected.getString("id")).apply()
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
                stage = "Клиент $id"
                fetch(client.getString("url"), File(dir, "$id.jar"), client.getString("sha1"), client.getLong("size"))
                var librariesCount = 0
                var assetsCount = 0
                if (includeFiles) {
                    val game = File(filesDir, "minecraft")
                    val libraries = GameFiles.libraries(data, File(game, "libraries"))
                    libraries.forEachIndexed { index, item ->
                        stage = "Библиотека ${index + 1}/${libraries.size}"
                        val message = stage
                        ui { if (!cancelled) status.text = message }
                        fetch(item.url, item.file, item.sha1, item.size)
                    }
                    librariesCount = libraries.size
                    val assetIndex = data.optJSONObject("assetIndex")
                        ?: error("У этой старой версии нет assetIndex. Поддержка legacy-ресурсов ещё не реализована.")
                    val indexFile = GameFiles.child(File(game, "assets/indexes"), assetIndex.getString("id") + ".json")
                    stage = "Индекс ресурсов"
                    fetch(assetIndex.getString("url"), indexFile, assetIndex.getString("sha1"), assetIndex.getLong("size"))
                    val indexData = JSONObject(indexFile.readText())
                    check(!indexData.optBoolean("virtual") && !indexData.optBoolean("map_to_resources")) {
                        "Для этой версии нужно legacy-размещение ресурсов; пока не поддерживается. Клиент и библиотеки сохранены."
                    }
                    val assets = GameFiles.assets(indexData, File(game, "assets/objects"))
                    assets.forEachIndexed { index, item ->
                        checkCancelled()
                        stage = "Ресурс ${index + 1}/${assets.size}"
                        // Avoid thousands of queued UI updates for small cached objects.
                        if (index % 20 == 0 || index == assets.lastIndex) {
                            val message = stage
                            ui { if (!cancelled) status.text = message }
                        }
                        fetch(item.url, item.file, item.sha1, item.size)
                    }
                    assetsCount = assets.size
                }
                checkCancelled()
                record("Скачано $id: libraries=$librariesCount assets=$assetsCount; includeFiles=$includeFiles. Запуск недоступен.")
                val java = data.optJSONObject("javaVersion")?.optInt("majorVersion", 8) ?: 8
                ui {
                    status.text = "Клиент $id проверен. Java-библиотек: $librariesCount, ресурсов: $assetsCount. Требуется Java $java. Это данные игры, НЕ рабочий запуск: Android JVM, графический слой и native-библиотеки отсутствуют."
                    busy(false)
                }
            } catch (e: Exception) {
                record("Ошибка установки: ${e.stackTraceToString()}")
                ui { status.text = if (cancelled) "Загрузка отменена. Проверенные файлы сохранены; повтор пропустит их." else "Ошибка загрузки: ${e.message}. Повторите или скопируйте диагностику."; busy(false) }
            }
        }
    }

    override fun onDestroy() {
        alive = false
        cancelled = true
        worker.shutdownNow()
        super.onDestroy()
    }
}
