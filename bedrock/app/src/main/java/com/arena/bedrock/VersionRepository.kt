package com.arena.bedrock

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import java.util.UUID
import java.util.zip.ZipFile

/** Private local APK library. Never extracts game code or modifies a Minecraft APK. */
class VersionRepository(private val context: Context) {
    val root: File get() = File(context.filesDir, "versions").apply { mkdirs() }
    data class Entry(val id: String, val version: String, val code: Long, val bytes: Long,
                     val sha256: String, val signer: String, val addedAt: Long)

    fun apk(entry: Entry): File {
        require(entry.id.matches(Regex("[a-f0-9-]{36}"))) { "Некорректная запись версии" }
        return File(root, "${entry.id}.apk")
    }
    fun list(): List<Entry> = root.listFiles().orEmpty().filter { it.extension == "json" }.mapNotNull { file ->
        runCatching {
            val o = JSONObject(file.readText())
            Entry(o.getString("id"), o.getString("version"), o.getLong("code"), o.getLong("bytes"),
                o.getString("sha256"), o.getString("signer"), o.getLong("addedAt")).takeIf { apk(it).isFile }
        }.getOrNull()
    }.sortedByDescending { it.addedAt }

    @Suppress("DEPRECATION")
    private fun flags() = PackageManager.GET_META_DATA or if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES

    @Suppress("DEPRECATION")
    private fun signatures(info: PackageInfo, history: Boolean = false): Set<String> {
        val values = if (Build.VERSION.SDK_INT >= 28) {
            val signing = info.signingInfo
            if (history && signing?.hasMultipleSigners() == false) signing.signingCertificateHistory else signing?.apkContentsSigners
        } else info.signatures
        return values.orEmpty().map { sha256(it.toByteArray()) }.toSet()
    }

    @Suppress("DEPRECATION")
    private fun inspect(file: File): PackageInfo {
        val info = context.packageManager.getPackageArchiveInfo(file.absolutePath, flags())
            ?: error("Файл не распознан как полноценный APK")
        require(info.packageName == MINECRAFT_PACKAGE) { "Это не APK Minecraft Bedrock (нужен пакет $MINECRAFT_PACKAGE)" }
        require(info.splitNames.isNullOrEmpty() && info.applicationInfo?.metaData?.getBoolean("com.android.vending.splits.required", false) != true) {
            "Split APK не поддерживается. Нужен один полноценный APK, не XAPK/APKS или base.apk"
        }
        require((info.applicationInfo?.minSdkVersion ?: 0) <= Build.VERSION.SDK_INT) { "Эта версия требует более новый Android" }
        val abi = ZipFile(file).use { zip ->
            zip.entries().asSequence().filter { !it.isDirectory && it.name.startsWith("lib/") && it.name.endsWith(".so") }
                .map { it.name.split('/').getOrNull(1).orEmpty() }.toSet()
        }
        require(abi.isEmpty() || Build.SUPPORTED_ABIS.any { it in abi }) { "APK не поддерживает процессор этого телефона: ${abi.joinToString()}" }
        val signers = signatures(info)
        require(signers.isNotEmpty()) { "В APK не найдена подпись" }
        val installed = runCatching { context.packageManager.getPackageInfo(MINECRAFT_PACKAGE, flags()) }.getOrNull()
        if (installed != null) require(signers.intersect(signatures(installed, true)).isNotEmpty()) {
            "Подпись APK не совпадает с установленным Minecraft. Файл не добавлен"
        }
        return info
    }

    /** Must run on a worker thread. Takes ownership of a completed .part only on success. */
    @Suppress("DEPRECATION")
    fun commit(part: File, hash: String, cancelled: () -> Boolean = { false }): Entry {
        require(hash.matches(Regex("[a-f0-9]{64}"))) { "Некорректный SHA-256" }
        check(!cancelled()) { "Операция отменена" }
        val info = inspect(part)
        check(!cancelled()) { "Операция отменена" }
        val duplicate = list().firstOrNull { it.sha256 == hash }
        if (duplicate != null) return duplicate
        val entry = Entry(UUID.randomUUID().toString(), info.versionName ?: "Без названия",
            if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong(),
            part.length(), hash, signatures(info).sorted().joinToString(), System.currentTimeMillis())
        val dest = apk(entry)
        check(part.renameTo(dest)) { "Не удалось сохранить APK" }
        val meta = File(root, "${entry.id}.json")
        val temp = File(root, "${entry.id}.json.part")
        try {
            temp.writeText(JSONObject().put("id", entry.id).put("version", entry.version).put("code", entry.code)
                .put("bytes", entry.bytes).put("sha256", entry.sha256).put("signer", entry.signer).put("addedAt", entry.addedAt).toString())
            check(temp.renameTo(meta)) { "Не удалось сохранить описание версии" }
        } catch (e: Exception) { dest.delete(); throw e } finally { temp.delete() }
        return entry
    }

    fun verify(entry: Entry, cancelled: () -> Boolean) {
        val file = apk(entry)
        require(file.length() == entry.bytes) { "Размер сохранённого APK изменился" }
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buf = ByteArray(65536)
            while (true) {
                check(!cancelled()) { "Операция отменена" }
                val n = input.read(buf)
                if (n < 0) break
                digest.update(buf, 0, n)
            }
        }
        require(digest.digest().toHex() == entry.sha256) { "Контрольная сумма APK не совпала. Удали файл и добавь его заново" }
        inspect(file) // Recheck current installed signing certificate before handing to Android.
    }
    fun delete(entry: Entry) {
        check(!apk(entry).exists() || apk(entry).delete()) { "Не удалось удалить APK" }
        File(root, "${entry.id}.json").delete()
    }
    companion object {
        private fun ByteArray.toHex() = joinToString("") { "%02x".format(it.toInt() and 255) }
        private fun sha256(bytes: ByteArray) = MessageDigest.getInstance("SHA-256").digest(bytes).toHex()
    }
}
