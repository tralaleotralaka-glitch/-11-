package com.arena.win11

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.nio.file.Files

class GameFilesTest {
    @Test fun rulesUseOrderAndLinuxNotDesktopNatives() {
        assertTrue(GameFiles.allowed(null))
        assertFalse(GameFiles.allowed(JSONArray()))
        assertTrue(GameFiles.allowed(JSONArray("""[{"action":"allow"},{"action":"disallow","os":{"name":"windows"}}]""")))
        assertFalse(GameFiles.allowed(JSONArray("""[{"action":"allow","os":{"name":"windows"}}]""")))
        assertFalse(GameFiles.allowed(JSONArray("""[{"action":"allow"},{"action":"disallow","os":{"name":"linux"}}]""")))
        assertFalse(GameFiles.allowed(JSONArray("""[{"action":"allow","features":{"is_demo_user":true}}]""")))
    }

    @Test fun rejectsTraversalAndAbsolutePaths() {
        val root = Files.createTempDirectory("gamefiles").toFile()
        try {
            for (path in listOf("../escape", "/absolute", "a/../../escape", "a\\b", "")) {
                try { GameFiles.child(root, path); fail("Accepted $path") }
                catch (_: IllegalArgumentException) { }
            }
            assertEquals(java.io.File(root, "a/b.jar"), GameFiles.child(root, "a/b.jar"))
        } finally { root.deleteRecursively() }
    }

    @Test fun selectsArtifactsWithoutDownloadingClassifiers() {
        val root = Files.createTempDirectory("libraries").toFile()
        try {
            val data = JSONObject("""{"libraries":[
              {"downloads":{"artifact":{"path":"a/b.jar","url":"https://libraries.minecraft.net/a/b.jar","sha1":"0000000000000000000000000000000000000000","size":1}}},
              {"downloads":{"classifiers":{"natives-linux":{"path":"native.jar"}}}}
            ]}""")
            val files = GameFiles.libraries(data, root)
            assertEquals(1, files.size)
            assertEquals(java.io.File(root, "a/b.jar"), files.single().file)
        } finally { root.deleteRecursively() }
    }

    @Test fun assetsDeduplicateHashesAndRejectMaliciousHashes() {
        val root = Files.createTempDirectory("assets").toFile()
        try {
            val hash = "0123456789012345678901234567890123456789"
            val obj = JSONObject().put("hash", hash).put("size", 7)
            val data = JSONObject().put("objects", JSONObject().put("a", obj).put("b", obj))
            val files = GameFiles.assets(data, root)
            assertEquals(1, files.size)
            assertEquals("https://resources.download.minecraft.net/01/$hash", files.single().url)
            obj.put("hash", "../../escape")
            try { GameFiles.assets(data, root); fail("Accepted traversal") }
            catch (_: IllegalArgumentException) { }
        } finally { root.deleteRecursively() }
    }

    @Test fun verifiesCacheAndDetectsCorruption() {
        val root = Files.createTempDirectory("cache").toFile()
        try {
            val file = java.io.File(root, "client.jar").apply { writeText("abc") }
            val hash = "a9993e364706816aba3e25717850c26c9cd0d89d"
            assertTrue(GameFiles.verified(file, hash, 3))
            assertFalse(GameFiles.verified(file, hash, 4))
            file.writeText("abd")
            assertFalse(GameFiles.verified(file, hash, 3))
            assertFalse(GameFiles.verified(java.io.File(root, "missing"), hash))
        } finally { root.deleteRecursively() }
    }

    @Test fun rejectsNegativeSizes() {
        try {
            GameFiles.artifact(JSONObject("""{"url":"https://example.com","sha1":"0000000000000000000000000000000000000000","size":-1}"""), java.io.File("x"))
            fail("Accepted negative size")
        } catch (_: IllegalArgumentException) { }
    }
}
