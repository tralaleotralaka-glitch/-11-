package com.arena.win11

import java.util.UUID

/** Local identity, NOT a Microsoft session or proof of game ownership. */
data class OfflineProfile private constructor(val name: String, val uuid: UUID) {
    companion object {
        fun create(input: String): OfflineProfile {
            val name = input.trim()
            require(name.matches(Regex("[A-Za-z0-9_]{3,16}"))) {
                "Ник: от 3 до 16 латинских букв, цифр или _"
            }
            return OfflineProfile(name, UUID.nameUUIDFromBytes("OfflinePlayer:$name".toByteArray(Charsets.UTF_8)))
        }
    }
}
