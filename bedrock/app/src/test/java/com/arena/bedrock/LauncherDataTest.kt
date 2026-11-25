package com.arena.bedrock

import org.junit.Assert.*
import org.junit.Test

class LauncherDataTest {
    @Test fun domainAndPortAreNormalized() {
        val server = BedrockServer.create(" My world ", "PLAY.Example.com.", "19132", "id")
        assertEquals("play.example.com", server.host)
        assertEquals("My world|play.example.com:19132", server.externalServerValue)
        assertEquals("id", server.id)
    }
    @Test fun ipv4AndIpv6() {
        assertEquals("LAN|192.168.1.2:19132", BedrockServer.create("LAN", "192.168.1.2", "19132").externalServerValue)
        assertEquals("LAN|[2001:db8::1]:19133", BedrockServer.create("LAN", "[2001:db8::1]", "19133").externalServerValue)
    }
    @Test fun internationalDomainUsesIdn() {
        assertEquals("xn--e1afmkfd.xn--p1ai", BedrockServer.create("Мир", "пример.рф", "19132").host)
    }
    @Test fun rejectsInvalidNames() {
        for (name in listOf("", " ", "bad|name", "a\nb", "a".repeat(41))) {
            rejects { BedrockServer.create(name, "example.com", "19132") }
        }
    }
    @Test fun rejectsInvalidHosts() {
        for (host in listOf("", "https://example.com", "a b", "evil.com/path", "user@evil.com", "example.com?x=1", "host|foo", "256.1.1.1", "1.2.3", "-host.com", "a..b", "x:19132", "::::")) {
            rejects { BedrockServer.create("A", host, "19132") }
        }
    }
    @Test fun rejectsInvalidPorts() {
        for (port in listOf("", "-1", "0", "65536", "1.5", "abc", "+80", "123456789")) {
            rejects { BedrockServer.create("A", "example.com", port) }
        }
    }
    @Test fun supportsPortBoundaries() {
        assertEquals(1, BedrockServer.create("A", "example.com", "1").port)
        assertEquals(65535, BedrockServer.create("A", "example.com", "65535").port)
    }
    @Test fun sanitizesImportsWithoutPathTraversal() {
        assertEquals("world.mcworld", ImportFiles.safeName("../../world.mcworld"))
        assertEquals("Textures.mcpack", ImportFiles.safeName("C:\\packs\\Textures.MCPACK"))
        assertEquals("my_pack.mcaddon", ImportFiles.safeName("my:pack.mcaddon"))
    }
    @Test fun rejectsUnrelatedFiles() {
        for (name in listOf("game.apk", "file.zip", "world.mcworld.exe", ".mcpack", "...mcworld", "file")) {
            rejects { ImportFiles.safeName(name) }
        }
    }
    @Test fun importMimeTypesAndLimit() {
        assertEquals("application/x-minecraft-world", ImportFiles.mime("world.mcworld"))
        assertEquals("application/x-minecraft-addon", ImportFiles.mime("addon.mcaddon"))
        assertEquals("application/x-minecraft-resourcepack", ImportFiles.mime("pack.mcpack"))
        rejects { ImportFiles.mime("file.zip") }
        assertEquals(536870912L, ImportFiles.MAX_BYTES)
    }
    private fun rejects(action: () -> Unit) {
        try { action(); fail("Invalid value accepted") } catch (_: IllegalArgumentException) { }
    }
}
