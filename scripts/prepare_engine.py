#!/usr/bin/env python3
"""Apply this project's documented changes to a pinned, separate Pojav source tree.
Never fetches credentials or game files. Runtime packages come from the official release.
"""
import json
import re
import shutil
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

PIN = "6b0ff501cc5fc8fe79d29ecd2244192a2f66e6c7"
A = "{http://schemas.android.com/apk/res/android}"
ET.register_namespace("android", "http://schemas.android.com/apk/res/android")
ET.register_namespace("tools", "http://schemas.android.com/tools")


def prepare(engine, runtime_apk, project):
    engine, project = Path(engine), Path(project)
    app = engine / "app_pojavlauncher"
    main = app / "src/main"
    # Only copy the Java runtime bundles, not upstream classes.dex or native libraries.
    # Native bridges are built from the pinned C sources by the normal NDK build.
    copied = []
    with ZipFile(runtime_apk) as apk:
        for info in apk.infolist():
            if not info.filename.startswith(("assets/components/jre/", "assets/components/jre-new/", "assets/components/jre-21/")) or info.is_dir():
                continue
            parts = Path(info.filename).parts
            if ".." in parts or Path(info.filename).is_absolute():
                raise ValueError("Unsafe runtime archive path")
            dest = main / info.filename
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(apk.read(info))
            copied.append(info.filename)
    for name in ("jre", "jre-new", "jre-21"):
        for filename in ("version", "universal.tar.xz", "bin-arm64.tar.xz"):
            # Some runtime releases call the ARM64 bundle bin-aarch64; check below instead.
            if filename == "bin-arm64.tar.xz":
                continue
            if not (main / f"assets/components/{name}/{filename}").is_file():
                raise ValueError(f"Missing runtime component {name}/{filename}")
        bins = list((main / f"assets/components/{name}").glob("bin-*.tar.xz"))
        if not bins:
            raise ValueError(f"Runtime {name} contains no architecture bundles")

    gradle = app / "build.gradle"
    text = gradle.read_text()
    for old, new in {
        'applicationId "net.kdt.pojavlaunch"': 'applicationId "com.arena.win11"',
        'minSdkVersion 21': 'minSdkVersion 24',
        'versionCode getDateSeconds()': 'versionCode 11',
        'versionName getVersionName()': 'versionName "0.5-engine-preview"',
        "applicationIdSuffix '.debug'": '// No suffix: updates the existing project APK',
        "'net.kdt.pojavlaunch.debug'": "'com.arena.win11'",
        "'net.kdt.pojavlaunch.scoped.gamefolder.debug'": "'com.arena.win11.scoped.gamefolder'",
        "'net.kdt.pojavlaunch.scoped.controlfolder.debug'": "'com.arena.win11.scoped.controlfolder'",
        "'net.kdt.pojavlaunch.scoped.gamefolder'": "'com.arena.win11.scoped.gamefolder'",
        "'net.kdt.pojavlaunch'": "'net.kdt.pojavlaunch'",  # Preserve JNI / Java namespace.
    }.items():
        if old not in text:
            raise ValueError(f"Pinned upstream build changed: {old}")
        text = text.replace(old, new)
    gradle.write_text(text)
    shutil.copyfile(project / "android/debug.keystore", app / "debug.keystore")

    manifest = main / "AndroidManifest.xml"
    tree = ET.parse(manifest)
    application = tree.getroot().find("application")
    assert application is not None
    # Keep the engine's in-package storage/bootstrap entry as the ONLY launcher entry.
    # It immediately opens LauncherActivity in this APK; no extra home or external app.
    entries = []
    for activity in application.findall("activity"):
        for intent in activity.findall("intent-filter"):
            if any(x.get(A + "name") == "android.intent.action.MAIN" for x in intent.findall("action")):
                entries.append(activity)
    if len(entries) != 1 or entries[0].get(A + "name") not in (
        ".TestStorageActivity", "net.kdt.pojavlaunch.TestStorageActivity"
    ):
        raise ValueError("Pinned engine must have exactly one in-APK bootstrap entry")
    entries[0].set(A + "label", "Java Launcher")
    entries[0].set(A + "exported", "true")
    application.set(A + "icon", "@drawable/arena_launcher_icon")
    application.set(A + "roundIcon", "@drawable/arena_launcher_icon")
    # The old prototype stores downloads in files/minecraft. Keep them; do not claim
    # they're a runnable Pojav installation or silently move account files.
    tree.write(manifest, encoding="utf-8", xml_declaration=True)
    for strings in (main / "res").glob("values*/strings.xml"):
        content = strings.read_text()
        content = re.sub(r'(<string name="app_name">).*?(</string>)', r'\g<1>Java Launcher · Pojav engine\2', content)
        content = re.sub(r'(<string name="app_short_name">).*?(</string>)', r'\g<1>Java Launcher\2', content)
        strings.write_text(content)
    (main / "res/drawable/arena_launcher_icon.xml").write_text('''<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="48dp" android:height="48dp" android:viewportWidth="48" android:viewportHeight="48">
<path android:fillColor="#111719" android:pathData="M0,0h48v48h-48z"/>
<path android:fillColor="#79D386" android:pathData="M12,10h26v7h-7v16q0,8 -10,8q-10,0 -10,-8v-5h7v5q0,2 3,2q3,0 3,-2v-16h-12z"/>
</vector>''')
    profiles = main / "assets/launcher_profiles.json"
    profiles.write_text(json.dumps({"profiles": {"Vanilla 1.12.2": {
        "name": "Vanilla 1.12.2", "lastVersionId": "1.12.2"
    }}, "selectedProfile": "Vanilla 1.12.2"}, indent=2))
    licenses = main / "assets/project_licenses"
    licenses.mkdir(parents=True, exist_ok=True)
    for path in (project / "launcher-engine/licenses").glob("*"):
        shutil.copyfile(path, licenses / path.name)
    (main / "assets/project_provenance.json").write_text(json.dumps({
        "version": "0.5-engine-preview", "engine": "PojavLauncherTeam/PojavLauncher",
        "source_commit": PIN, "runtime_release": "gladiolus", "copied_runtime_files": copied,
        "native_bridges": "built from pinned C sources", "entry": "in-APK TestStorageActivity -> LauncherActivity -> MainActivity; no external launcher",
    }, indent=2))
    print(f"Prepared engine {PIN}; {len(copied)} runtime bundle files")


if __name__ == "__main__":
    prepare(sys.argv[1], sys.argv[2], Path(__file__).resolve().parents[1])
