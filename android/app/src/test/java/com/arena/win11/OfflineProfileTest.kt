package com.arena.win11

import org.junit.Assert.*
import org.junit.Test

class OfflineProfileTest {
    @Test fun knownMinecraftOfflineUuid() {
        assertEquals("5627dd98-e6be-3c21-b8a8-e92344183641", OfflineProfile.create("Notch").uuid.toString())
    }
    @Test fun stableAndTrimmed() {
        assertEquals(OfflineProfile.create("Player"), OfflineProfile.create(" Player "))
        assertNotEquals(OfflineProfile.create("Player").uuid, OfflineProfile.create("player").uuid)
    }
    @Test fun acceptsValidBoundaries() {
        assertEquals("Ab_", OfflineProfile.create("Ab_").name)
        assertEquals(16, OfflineProfile.create("abcdefghijklmnop").name.length)
    }
    @Test fun rejectsInvalidNames() {
        for (name in listOf("", "ab", "abcdefghijklmnopq", "друг", "a b", "abc\nxyz", "../foo")) {
            try {
                OfflineProfile.create(name)
                fail("Accepted invalid name: $name")
            } catch (_: IllegalArgumentException) { }
        }
    }
}
