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
}
