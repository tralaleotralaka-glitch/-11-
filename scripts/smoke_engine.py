#!/usr/bin/env python3
"""Android emulator smoke test. Does NOT claim to test Minecraft gameplay or licensing."""
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PACKAGE = "com.arena.win11"
OUT = Path("dist")


def adb(*args, check=True, binary=False):
    result = subprocess.run(["adb", *args], capture_output=True, timeout=120, check=check)
    return result.stdout if binary else result.stdout.decode(errors="replace")


def window():
    adb("shell", "uiautomator", "dump", "/sdcard/launcher-smoke.xml", check=False)
    xml = adb("shell", "cat", "/sdcard/launcher-smoke.xml", check=False)
    return xml


try:
    print(adb("install", "-r", sys.argv[1]))
    adb("logcat", "-c")
    print(adb("shell", "am", "start", "-W", "-n", f"{PACKAGE}/com.arena.javalauncher.HomeActivity"))
    deadline = time.monotonic() + 90
    clicked = False
    while time.monotonic() < deadline:
        xml = window()
        if "Открыть игровое меню" in xml:
            tree = ET.fromstring(xml)
            node = next(n for n in tree.iter("node") if n.get("text") == "Открыть игровое меню")
            x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.get("bounds")))
            (OUT / "home-smoke.png").write_bytes(adb("exec-out", "screencap", "-p", binary=True))
            adb("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))
            clicked = True
            break
    assert clicked, "Own launcher home/button did not become visible"
    deadline = time.monotonic() + 180
    ready = False
    while time.monotonic() < deadline:
        activity = adb("shell", "dumpsys", "activity", "activities")
        xml = window()
        assert not any(name in activity for name in ("mResumedActivity: ActivityRecord{ERROR",)), activity
        resumed = "\n".join(line for line in activity.splitlines() if "mResumedActivity" in line)
        assert "FatalErrorActivity" not in resumed and "ShowErrorActivity" not in resumed, resumed
        runtime = adb("shell", "run-as", PACKAGE, "cat", "runtimes/Internal/pojav_version", check=False).strip()
        if "net.kdt.pojavlaunch.LauncherActivity" in resumed and runtime and PACKAGE in xml:
            ready = True
            break
    assert ready, "Engine menu or Java 8 runtime extraction did not finish"
    (OUT / "engine-smoke.png").write_bytes(adb("exec-out", "screencap", "-p", binary=True))
    (OUT / "engine-smoke-ui.xml").write_text(xml)
    log = adb("logcat", "-d", "-v", "threadtime")
    assert not re.search(r"FATAL EXCEPTION.*\n(?:.*\n){0,3}.*Process: com\.arena\.win11", log), "App crashed; inspect logcat"
    message = "PASS: own home -> engine menu; Java 8 unpacked. Minecraft gameplay NOT tested."
    (OUT / "engine-smoke-result.txt").write_text(message + "\n" + resumed + "\nRuntime: " + runtime)
    print(message)
except Exception as error:
    import traceback
    log = adb("logcat", "-d", "-v", "threadtime", check=False)
    lines = log.splitlines()
    relevant = []
    for i, line in enumerate(lines):
        if any(word in line for word in ("FATAL EXCEPTION", "PojavCrashReport", "JREAuto", "AndroidRuntime", "Fatal signal")):
            relevant.extend(lines[max(0, i-1):i+12])
    activities = adb("shell", "dumpsys", "activity", "activities", check=False)
    details = traceback.format_exc() + "\nRESUMED:\n" + "\n".join(x for x in activities.splitlines() if "ResumedActivity" in x) + "\nUI:\n" + window()[:12000] + "\nLOG:\n" + "\n".join(relevant)[-20000:]
    details = details.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    print('::error title=Emulator smoke diagnostics::' + details, flush=True)
    raise
finally:
    (OUT / "engine-smoke-logcat.txt").write_text(adb("logcat", "-d", "-v", "threadtime", check=False))
