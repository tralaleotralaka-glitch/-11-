package com.arena.bedrock

import java.io.InputStream
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URI
import java.security.MessageDigest

/** User-provided HTTPS downloads only. No catalog or third-party Minecraft APK links. */
object ApkTransfers {
    const val MAX_BYTES = 1536L * 1024 * 1024

    fun url(input: String): URI {
        val uri = try { URI(input.trim()) } catch (_: Exception) { throw IllegalArgumentException("Некорректная ссылка") }
        require(uri.scheme.equals("https", true) && !uri.host.isNullOrBlank() && uri.rawUserInfo == null && uri.rawFragment == null && (uri.port == -1 || uri.port in 1..65535)) {
            "Нужна прямая HTTPS-ссылка без логина, пароля или #фрагмента"
        }
        return uri
    }

    fun expectedHash(input: String): String? {
        val value = input.trim().lowercase()
        if (value.isEmpty()) return null
        require(value.matches(Regex("[a-f0-9]{64}"))) { "SHA-256 должен содержать 64 шестнадцатеричных символа" }
        return value
    }

    fun copy(input: InputStream, output: OutputStream, length: Long?, cancelled: () -> Boolean,
             freeSpace: () -> Long, progress: (Long, Long?) -> Unit): String {
        require(length == null || length in 1..MAX_BYTES) { "Пустой файл или APK больше 1,5 ГБ" }
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = ByteArray(65536)
        var total = 0L
        var next = 0L
        while (true) {
            check(!cancelled()) { "Операция отменена" }
            val n = input.read(buffer)
            if (n < 0) break
            total += n
            require(total <= MAX_BYTES && (length == null || total <= length)) { "Размер APK превышает заявленный или лимит 1,5 ГБ" }
            check(freeSpace() > n + 16L * 1024 * 1024) { "Недостаточно свободного места" }
            output.write(buffer, 0, n)
            digest.update(buffer, 0, n)
            if (total >= next) { progress(total, length); next = total + 1_048_576 }
        }
        require(total > 0 && (length == null || total == length)) { "APK загружен не полностью" }
        check(!cancelled()) { "Операция отменена" }
        progress(total, length)
        return digest.digest().joinToString("") { "%02x".format(it.toInt() and 255) }
    }

    fun download(link: String, output: OutputStream, cancelled: () -> Boolean,
                 freeSpace: () -> Long, progress: (Long, Long?) -> Unit): String {
        var address = url(link)
        repeat(6) { attempt ->
            check(!cancelled()) { "Операция отменена" }
            val conn = address.toURL().openConnection() as HttpURLConnection
            try {
                conn.instanceFollowRedirects = false
                conn.connectTimeout = 15000
                conn.readTimeout = 15000
                conn.setRequestProperty("User-Agent", "BedrockLauncher/1.1")
                conn.setRequestProperty("Accept-Encoding", "identity")
                val code = conn.responseCode
                if (code in setOf(301, 302, 303, 307, 308)) {
                    require(attempt < 5) { "Слишком много перенаправлений" }
                    val location = conn.getHeaderField("Location") ?: error("Нет адреса перенаправления")
                    address = url(address.resolve(location).toString())
                } else {
                    check(code == 200) { "Сервер ответил HTTP $code" }
                    require(!conn.contentType.orEmpty().startsWith("text/", true)) { "По ссылке страница, а не APK. Нужна прямая ссылка на файл" }
                    val length = conn.contentLengthLong.takeIf { it >= 0 }
                    return conn.inputStream.use { copy(it, output, length, cancelled, freeSpace, progress) }
                }
            } finally { conn.disconnect() }
        }
        error("Слишком много перенаправлений")
    }
}
