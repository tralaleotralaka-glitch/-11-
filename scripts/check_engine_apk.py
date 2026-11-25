#!/usr/bin/env python3
"""Fail CI if an APK silently ships without runtime, renderer or project code."""
import json
import sys
from zipfile import ZipFile

with ZipFile(sys.argv[1]) as apk:
    names = set(apk.namelist())
    for component in ("jre", "jre-new", "jre-21"):
        for part in ("version", "universal.tar.xz", "bin-arm64.tar.xz", "bin-x86_64.tar.xz"):
            path = f"assets/components/{component}/{part}"
            assert path in names, f"Missing {path}"
            assert apk.getinfo(path).file_size > 0, f"Empty {path}"
    for abi in ("arm64-v8a", "armeabi-v7a", "x86", "x86_64"):
        for lib in ("libpojavexec.so", "libpojavexec_awt.so", "libgl4es_114.so", "liblwjgl.so", "libopenal.so"):
            path = f"lib/{abi}/{lib}"
            assert path in names, f"Missing {path}"
            assert apk.read(path)[:4] == b"\x7fELF", f"Not ELF: {path}"
    dex = b"".join(apk.read(name) for name in names if name.endswith(".dex"))
    for cls in (b"Lcom/arena/javalauncher/HomeActivity;", b"Lnet/kdt/pojavlaunch/MainActivity;"):
        assert cls in dex, f"Missing class {cls}"
    for component in ("lwjgl3", "security", "arc_dns_injector", "forge_installer"):
        assert f"assets/components/{component}/version" in names, f"Missing {component}"
    provenance = json.loads(apk.read("assets/project_provenance.json"))
    assert provenance["version"] == "0.4-engine-preview"
    print(json.dumps(provenance, indent=2))
    print("Verified: project home + game classes + Java bundles + native bridges + GL4ES, all 4 ABIs")
