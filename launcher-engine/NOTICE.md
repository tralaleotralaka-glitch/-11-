# Java Launcher 0.5 — third-party engine and reproducible modifications

This is a **derivative PojavLauncher build**, not an independently authored JVM or renderer.
The original project authors and their notices are retained. Not affiliated with Mojang,
Microsoft, or the PojavLauncher maintainers. No Minecraft client/assets are bundled.

## Project modifications

The preparation/check/smoke scripts, icon and build overlay were added by this project.
The extra HomeActivity from 0.4 was removed in 0.5: launching the app icon immediately
enters the integrated engine menu, without a hand-off screen or external launcher. These engine-overlay modifications are provided under LGPL-3.0-or-later.
This notice does not relicense unrelated pre-existing project files.

The namespace `net.kdt.pojavlaunch` is intentionally retained for JNI compatibility.
Application ID is `com.arena.win11`; versionCode 11; the existing public development
signing key is used so an APK can update the previous project prototype.
Development signing is **not** a production signing/security arrangement.

## Engine

- Source: https://github.com/PojavLauncherTeam/PojavLauncher
- Exact engine commit: `6b0ff501cc5fc8fe79d29ecd2244192a2f66e6c7` (gladiolus)
- License: GNU LGPL v3, with GPL v3 incorporated; texts in `licenses/`.
- Engine Java and C JNI bridges are compiled from that source, not copied dex.
- Original native renderer libraries already present in that source tree are retained.
- Source archive attached to the release contains that engine source and this project's
  complete build scripts and overlay under `project/`.

## Runtime bundles

Unmodified Android Java 8/17/21 bundles are extracted from the official `gladiolus`
PojavLauncher.apk release; no upstream launcher dex or .so is copied from the APK.
The input SHA-256 is saved into the generated APK, build artifact and source archive.
The original release asset is ID `225133165`, upstream GitHub release `gladiolus`.

Upstream runtime sources/build recipes and component credits:
- https://github.com/PojavLauncherTeam/android-openjdk-build-multiarch
- https://github.com/PojavLauncherTeam/openjdk-multiarch-jdk8u
- https://github.com/PojavLauncherTeam/PojavLauncher/tree/6b0ff501cc5fc8fe79d29ecd2244192a2f66e6c7#credits--third-party-components-and-their-licenses-if-available

OpenJDK is GPLv2 with the Classpath Exception; retain its original license notices in
runtime archives. Other components retain their original licenses (including GL4ES,
LWJGL, Mesa, AndroidX, bhook, Caciocavallo, pro-grade). See the original engine README,
source tree and bundled library notices for their upstream links and terms.
LTW, an optional proprietary renderer, is **not downloaded or added** by this build.

## Rebuild / relink

Run the checked-in `Build Java launcher with game engine` Actions workflow. It checks
out the exact source above into a separate directory, obtains runtime bundles, applies
`scripts/prepare_engine.py`, and uses JDK 8 + 17, Gradle 8.11 and Android NDK 25.2.
The overlay preserves all game activities/services, native loading and upstream account
handling. TestStorageActivity is the only launcher entry. It prepares engine assets and
opens the version/account/game UI. All game activities and services belong to the same
application ID, com.arena.win11; :game is its private game process, not a separate app.

Users may modify and rebuild/relink this combined work; no anti-modification checks
or proprietary service lock are added. APKs are installable via normal Android sideloading.

## Testing scope

Python tests cover the overlay. ZIP validation checks all runtime packages, GL4ES and
native bridges for ARM32/64 and x86/64. An x86_64 Android emulator smoke test starts the app through its registered launcher
entry, checks the engine menu is in package com.arena.win11, verifies that no external
PojavLauncher APK is installed, and checks Java 8 extraction and crash logs.
**These are not Minecraft gameplay, GPU compatibility, Microsoft OAuth or physical
ARM-device tests.** The first target to verify on a phone is Vanilla 1.12.2 / Java 8 / GL4ES.
The old prototype downloads under files/minecraft are not moved or silently treated as
an engine installation; the engine manages its own game directory. Offline identity does
not grant a game license or access to authenticated servers. Upstream authentication
checks are not removed or weakened.
