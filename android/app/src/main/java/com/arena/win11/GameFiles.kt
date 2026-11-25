package com.arena.win11

import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest

/** Downloads desktop Java artifacts only. Android native libraries are a separate runtime task. */
object GameFiles {
    data class Artifact(val url: String, val file: File, val sha1: String, val size: Long)

    fun child(root: File, path: String): File {
        require(path.isNotBlank() && !path.startsWith('/') && !path.contains('\\')) { "Недопустимый путь" }
        val file = File(root, path).canonicalFile
        require(file.path.startsWith(root.canonicalPath + File.separator)) { "Путь вне каталога игры" }
        return file
    }

    fun allowed(rules: JSONArray?): Boolean {
        if (rules == null) return true
        var allowed = false
        for (i in 0 until rules.length()) {
            val rule = rules.getJSONObject(i)
            // Feature-dependent artifacts and OS-version/architecture rules need runtime capabilities.
            if (rule.has("features")) continue
            val os = rule.optJSONObject("os")
            if (os != null && (os.optString("name") != "linux" || os.has("arch") || os.has("version"))) continue
            allowed = rule.getString("action") == "allow"
        }
        return allowed
    }

    fun artifact(data: JSONObject, file: File): Artifact {
        val hash = data.getString("sha1")
        require(hash.matches(Regex("[a-fA-F0-9]{40}"))) { "Некорректный SHA-1" }
        val size = data.getLong("size")
        require(size in 0..2_147_483_648L) { "Некорректный размер файла" }
        return Artifact(data.getString("url"), file, hash, size)
    }

    fun libraries(version: JSONObject, root: File): List<Artifact> {
        val libraries = version.optJSONArray("libraries") ?: return emptyList()
        return (0 until libraries.length()).map { libraries.getJSONObject(it) }
            .filter { allowed(it.optJSONArray("rules")) }
            .mapNotNull { it.optJSONObject("downloads")?.optJSONObject("artifact") }
            .map { artifact(it, child(root, it.getString("path"))) }
            .distinctBy { it.file.path }
    }

    fun assets(index: JSONObject, root: File): List<Artifact> {
        val objects = index.getJSONObject("objects")
        // Content-addressed assets can have several logical names. Fetch each hash once.
        return objects.keys().asSequence().map { objects.getJSONObject(it) }.map { obj ->
            val hash = obj.getString("hash")
            require(hash.matches(Regex("[a-f0-9]{40}"))) { "Некорректный хеш ресурса" }
            val path = "${hash.take(2)}/$hash"
            artifact(JSONObject().put("url", "https://resources.download.minecraft.net/$path")
                .put("sha1", hash).put("size", obj.getLong("size")), child(root, path))
        }.distinctBy { it.sha1 }.toList()
    }

    fun verified(file: File, hash: String, size: Long? = null, cancelled: () -> Boolean = { false }): Boolean {
        if (!file.isFile || (size != null && file.length() != size)) return false
        val digest = MessageDigest.getInstance("SHA-1")
        file.inputStream().use { input ->
            val buffer = ByteArray(65536)
            while (true) {
                check(!cancelled()) { "Загрузка отменена" }
                val n = input.read(buffer)
                if (n < 0) break
                digest.update(buffer, 0, n)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it.toInt() and 255) }.equals(hash, true)
    }
}
