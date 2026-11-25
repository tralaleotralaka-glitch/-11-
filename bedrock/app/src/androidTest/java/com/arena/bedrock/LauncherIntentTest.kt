package com.arena.bedrock

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import androidx.test.core.app.ActivityScenario
import androidx.test.espresso.Espresso.closeSoftKeyboard
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.*
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/** Contract tests against a CI-only receiver, NOT Minecraft gameplay tests. */
@RunWith(AndroidJUnit4::class)
class LauncherIntentTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext

    @Before fun reset() {
        context.getSharedPreferences("bedrock", Context.MODE_PRIVATE).edit().clear().commit()
        File(context.filesDir, "versions").deleteRecursively()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        android.os.ParcelFileDescriptor.AutoCloseInputStream(instrumentation.uiAutomation.executeShellCommand("am force-stop com.mojang.minecraftpe")).use { it.readBytes() }
    }

    private fun capture(action: () -> Unit): Intent {
        val latch = CountDownLatch(1)
        var result: Intent? = null
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) { result = intent; latch.countDown() }
        }
        val filter = IntentFilter("com.arena.bedrock.TEST_RESULT")
        if (Build.VERSION.SDK_INT >= 33) context.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
        else {
            @Suppress("DEPRECATION")
            context.registerReceiver(receiver, filter)
        }
        try {
            action()
            assertTrue("Test game did not receive an intent", latch.await(30, TimeUnit.SECONDS))
            return result ?: throw AssertionError("Missing result")
        } finally { context.unregisterReceiver(receiver) }
    }

    @Test fun playOpensOnlyOfficialPackage() {
        ActivityScenario.launch(MainActivity::class.java).use {
            val result = capture { onView(withContentDescription("play")).perform(scrollTo(), click()) }
            assertEquals(Intent.ACTION_MAIN, result.getStringExtra("action"))
        }
    }

    @Test fun serverIsSavedAndPassedAsEncodedDeepLink() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            onView(withContentDescription("tab_servers")).perform(click())
            onView(withContentDescription("add_server")).perform(click())
            onView(withContentDescription("server_name")).perform(replaceText("My & LAN"))
            onView(withContentDescription("server_host")).perform(replaceText("play.example.com"))
            onView(withContentDescription("server_port")).perform(replaceText("19133"))
            closeSoftKeyboard()
            onView(withContentDescription("save_server")).perform(click())
            scenario.recreate()
            val result = capture { onView(withText("Добавить в Minecraft")).perform(scrollTo(), click()) }
            val uri = Uri.parse(result.getStringExtra("uri"))
            assertEquals(Intent.ACTION_VIEW, result.getStringExtra("action"))
            assertEquals("minecraft", uri.scheme)
            assertEquals("My & LAN|play.example.com:19133", uri.getQueryParameter("addExternalServer"))
        }
    }

    @Test fun importIsReadableInAnotherUidAndUsesNarrowContentUri() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val file = File(context.cacheDir, "imports/test-pack.mcpack").apply { parentFile!!.mkdirs() }
            ZipOutputStream(file.outputStream()).use { zip ->
                zip.putNextEntry(ZipEntry("manifest.json")); zip.write("{\"format_version\":2}".toByteArray()); zip.closeEntry()
            }
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.imports", file)
            val result = capture {
                scenario.onActivity { activity ->
                    val method = MainActivity::class.java.getDeclaredMethod("onActivityResult", Int::class.javaPrimitiveType, Int::class.javaPrimitiveType, Intent::class.java)
                    method.isAccessible = true
                    method.invoke(activity, 101, Activity.RESULT_OK, Intent().setData(uri))
                }
            }
            assertEquals(Intent.ACTION_VIEW, result.getStringExtra("action"))
            assertEquals("application/x-minecraft-resourcepack", result.getStringExtra("mime"))
            assertTrue("Read permission was not granted across app UIDs", result.getBooleanExtra("readable", false))
            val output = Uri.parse(result.getStringExtra("uri"))
            assertEquals("content", output.scheme)
            assertEquals("com.arena.bedrock.imports", output.authority)
            assertTrue(result.getIntExtra("flags", 0) and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0)
        }
    }
    private fun waitForVersionTask(scenario: ActivityScenario<MainActivity>) {
        val deadline = android.os.SystemClock.elapsedRealtime() + 30000
        while (android.os.SystemClock.elapsedRealtime() < deadline) {
            var busy = true
            scenario.onActivity { activity ->
                val field = MainActivity::class.java.getDeclaredField("versionBusy").apply { isAccessible = true }
                busy = field.getBoolean(activity)
            }
            if (!busy) return
            android.os.SystemClock.sleep(100)
        }
        fail("APK task did not finish")
    }

    private fun pickApk(scenario: ActivityScenario<MainActivity>, file: File) {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.imports", file)
        scenario.onActivity { activity ->
            val method = MainActivity::class.java.getDeclaredMethod("onActivityResult", Int::class.javaPrimitiveType, Int::class.javaPrimitiveType, Intent::class.java)
            method.isAccessible = true
            method.invoke(activity, 102, Activity.RESULT_OK, Intent().setData(uri))
        }
        waitForVersionTask(scenario)
    }

    private fun requireVersion(scenario: ActivityScenario<MainActivity>): VersionRepository.Entry {
        val repo = VersionRepository(context)
        var status = ""
        scenario.onActivity { activity ->
            status = MainActivity::class.java.getDeclaredField("message").apply { isAccessible = true }.get(activity).toString()
        }
        val entries = repo.list()
        assertTrue("APK not saved: $status; files=${repo.root.listFiles()?.joinToString { it.name }}", entries.isNotEmpty())
        return entries.single()
    }

    private fun fixture(): File {
        val file = File(context.filesDir, "versions/source.apk").apply { parentFile!!.mkdirs() }
        InstrumentationRegistry.getInstrumentation().context.assets.open("fixture-minecraft.apk").use { input -> file.outputStream().use { input.copyTo(it) } }
        return file
    }

    @Test fun versionApkIsValidatedDeduplicatedAndRestored() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val source = fixture()
            pickApk(scenario, source)
            val repo = VersionRepository(context)
            val entry = requireVersion(scenario)
            assertEquals("test-fixture-not-minecraft", entry.version)
            assertEquals(1L, entry.code)
            assertEquals(64, entry.sha256.length)
            assertTrue(entry.signer.isNotEmpty())
            pickApk(scenario, source)
            assertEquals(1, repo.list().size)
            onView(withContentDescription("tab_versions")).perform(click())
            scenario.recreate()
            assertEquals(entry.id, context.getSharedPreferences("bedrock", Context.MODE_PRIVATE).getString("selected_version", null))
            repo.verify(entry) { false }
            repo.apk(entry).appendText("tampered")
            try { repo.verify(entry) { false }; fail("Modified APK accepted") } catch (_: IllegalArgumentException) { }
        }
    }

    @Test fun invalidApkNeverAppearsInLibrary() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val file = File(context.filesDir, "versions/not-an-apk.apk").apply { parentFile!!.mkdirs(); writeText("not an APK") }
            pickApk(scenario, file)
            assertTrue(VersionRepository(context).list().isEmpty())
            assertTrue(File(context.filesDir, "versions").listFiles().orEmpty().none { it.name.endsWith(".pending.apk") })
        }
    }

    @Test fun unsignedApkWithMinecraftPackageIsRejected() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            val source = fixture()
            val unsigned = File(context.filesDir, "versions/unsigned.apk")
            java.util.zip.ZipFile(source).use { original ->
                ZipOutputStream(unsigned.outputStream()).use { output ->
                    original.entries().asSequence().filter { !it.isDirectory && !it.name.startsWith("META-INF/") }.forEach { entry ->
                        output.putNextEntry(ZipEntry(entry.name))
                        original.getInputStream(entry).use { it.copyTo(output) }
                        output.closeEntry()
                    }
                }
            }
            pickApk(scenario, unsigned)
            assertTrue("Unsigned APK must never be accepted", VersionRepository(context).list().isEmpty())
        }
    }

    @Test fun installationRequiresConfirmationAndUsesSystemInstallerIntent() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        android.os.ParcelFileDescriptor.AutoCloseInputStream(instrumentation.uiAutomation.executeShellCommand("appops set com.arena.bedrock REQUEST_INSTALL_PACKAGES allow")).use { it.readBytes() }
        androidx.test.espresso.intent.Intents.init()
        try {
            @Suppress("DEPRECATION")
            val installAction = Intent.ACTION_INSTALL_PACKAGE
            androidx.test.espresso.intent.Intents.intending(androidx.test.espresso.intent.matcher.IntentMatchers.hasAction(installAction))
                .respondWith(android.app.Instrumentation.ActivityResult(Activity.RESULT_CANCELED, null))
            ActivityScenario.launch(MainActivity::class.java).use { scenario ->
                pickApk(scenario, fixture())
                val entry = requireVersion(scenario)
                onView(withContentDescription("tab_versions")).perform(click())
                onView(withContentDescription("install_version_${entry.id}")).perform(scrollTo(), click())
                assertTrue(androidx.test.espresso.intent.Intents.getIntents().none { it.action == installAction })
                onView(withText("Продолжить")).perform(click())
                waitForVersionTask(scenario)
                instrumentation.waitForIdleSync()
                val intent = androidx.test.espresso.intent.Intents.getIntents().single { it.action == installAction }
                assertEquals("content", intent.data?.scheme)
                assertEquals("com.arena.bedrock.imports", intent.data?.authority)
                assertTrue(intent.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0)
            }
        } finally { androidx.test.espresso.intent.Intents.release() }
    }

}
