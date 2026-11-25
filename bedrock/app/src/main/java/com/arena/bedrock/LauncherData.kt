package com.arena.bedrock

import java.net.IDN
import java.net.InetAddress
import java.util.UUID

const val MINECRAFT_PACKAGE = "com.mojang.minecraftpe"

/** Plain launcher data. No game engine, license tokens or Microsoft passwords. */
data class BedrockServer(val id: String, val name: String, val host: String, val port: Int) {
    val externalServerValue: String get() = "$name|${if (host.contains(':')) "[$host]" else host}:$port"

    companion object {
        fun create(name: String, host: String, port: String, id: String = UUID.randomUUID().toString()): BedrockServer {
            val label = name.trim()
            require(label.length in 1..40 && label.none { it.isISOControl() || it == '|' }) {
                "Название: 1–40 символов, без переноса строки и |"
            }
            val input = host.trim().removePrefix("[").removeSuffix("]")
            require(input.isNotEmpty() && input.none { it.isWhitespace() || it in "/\\@?#|%" }) {
                "Введите только адрес сервера, без https:// и порта"
            }
            val address = if (input.contains(':')) {
                require(input.matches(Regex("[0-9a-fA-F:.]+")) && runCatching { InetAddress.getByName(input).address.size == 16 }.getOrDefault(false)) {
                    "Некорректный IPv6-адрес"
                }
                input.lowercase()
            } else {
                val ascii = IDN.toASCII(input.removeSuffix("."), IDN.USE_STD3_ASCII_RULES).lowercase()
                require(ascii.length in 1..253 && ascii.split('.').all {
                    it.length in 1..63 && it.matches(Regex("[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"))
                }) { "Некорректный домен или IPv4-адрес" }
                if (ascii.matches(Regex("[0-9.]+"))) {
                    require(ascii.split('.').size == 4 && ascii.split('.').all { it.toIntOrNull()?.let { number -> number in 0..255 } == true }) {
                        "Некорректный IPv4-адрес"
                    }
                }
                ascii
            }
            val portText = port.trim()
            require(portText.matches(Regex("[0-9]{1,5}"))) { "Порт: число от 1 до 65535" }
            val number = portText.toInt()
            require(number in 1..65535) { "Порт: число от 1 до 65535" }
            return BedrockServer(id, label, address, number)
        }
    }
}

object ImportFiles {
    const val MAX_BYTES = 512L * 1024 * 1024
    fun safeName(displayName: String): String {
        val base = displayName.substringAfterLast('/').substringAfterLast('\\').trim()
        val extension = base.substringAfterLast('.', "").lowercase()
        require(extension in setOf("mcpack", "mcaddon", "mcworld")) {
            "Выберите файл .mcpack, .mcaddon или .mcworld"
        }
        val stem = base.substringBeforeLast('.').map {
            if (it.isISOControl() || it in ":*?\"<>|") '_' else it
        }.joinToString("").take(100).trim().trim('.')
        require(stem.isNotEmpty()) { "У файла нет имени" }
        return "$stem.$extension"
    }
    fun mime(name: String): String = when (name.substringAfterLast('.').lowercase()) {
        "mcworld" -> "application/x-minecraft-world"
        "mcaddon" -> "application/x-minecraft-addon"
        "mcpack" -> "application/x-minecraft-resourcepack"
        else -> throw IllegalArgumentException("Неподдерживаемый файл")
    }
}
