package com.arena.bedrock

import org.junit.Assert.*
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream

class ApkTransfersTest {
    @Test fun acceptsHttpsAndSignedQueries() {
        assertEquals("example.com", ApkTransfers.url(" https://example.com/game?token=abc%2F123 ").host)
        assertEquals("https", ApkTransfers.url("https://example.com:8443/file").scheme)
    }
    @Test fun refusesUnsafeOrAmbiguousUrls() {
        for (url in listOf("http://example.com/game.apk", "file:///data/file.apk", "https://user:password@example.com/file", "https://example.com/#fragment", "https:///foo", "not a url", "https://host:0/file", "https://host:99999/file")) {
            rejects { ApkTransfers.url(url) }
        }
    }
    @Test fun verifiesExpectedHashSyntax() {
        assertNull(ApkTransfers.expectedHash(" "))
        assertEquals("a".repeat(64), ApkTransfers.expectedHash("A".repeat(64)))
        rejects { ApkTransfers.expectedHash("abc") }
        rejects { ApkTransfers.expectedHash("x".repeat(64)) }
    }
    @Test fun copyChecksLengthAndComputesSha256() {
        val out = ByteArrayOutputStream()
        val hash = ApkTransfers.copy(ByteArrayInputStream("abc".toByteArray()), out, 3, { false }, { Long.MAX_VALUE }) { _, _ -> }
        assertEquals("abc", out.toString())
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", hash)
    }
    @Test fun rejectsEmptyOversizeAndTruncatedBodies() {
        for (length in listOf(0L, ApkTransfers.MAX_BYTES + 1, 4L, 2L)) {
            rejects {
                ApkTransfers.copy(ByteArrayInputStream("abc".toByteArray()), ByteArrayOutputStream(), length, { false }, { Long.MAX_VALUE }) { _, _ -> }
            }
        }
        rejects { ApkTransfers.copy(ByteArrayInputStream(byteArrayOf()), ByteArrayOutputStream(), null, { false }, { Long.MAX_VALUE }) { _, _ -> } }
    }
    @Test fun cancelledOrNoSpaceNeverFinishes() {
        for ((cancel, space) in listOf(true to Long.MAX_VALUE, false to 0L)) {
            try {
                ApkTransfers.copy(ByteArrayInputStream("abc".toByteArray()), ByteArrayOutputStream(), null, { cancel }, { space }) { _, _ -> }
                fail("Operation should fail")
            } catch (_: IllegalStateException) { }
        }
    }
    private fun rejects(action: () -> Unit) {
        try { action(); fail("Invalid value accepted") } catch (_: IllegalArgumentException) { }
    }
}
