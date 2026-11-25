#!/usr/bin/env python3
"""Check the real launcher without Minecraft installed. No fake game in this phase."""
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

OUT = Path('dist')
PACKAGE = 'com.arena.bedrock'


def adb(*args, binary=False):
    data = subprocess.check_output(['adb', *args], timeout=90)
    return data if binary else data.decode(errors='replace')


def window():
    adb('shell', 'uiautomator', 'dump', '/sdcard/bedrock-smoke.xml')
    return adb('shell', 'cat', '/sdcard/bedrock-smoke.xml')


try:
    assert 'package:com.mojang.minecraftpe' not in adb('shell', 'pm', 'list', 'packages', '-3')
    print(adb('install', '-r', sys.argv[1]))
    adb('logcat', '-c')
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    deadline = time.monotonic() + 45
    found = False
    while time.monotonic() < deadline:
        xml = window()
        if 'Minecraft не установлен' in xml:
            found = True
            break
    assert found, 'Missing-game status did not appear'
    (OUT / 'bedrock-home-smoke.png').write_bytes(adb('exec-out', 'screencap', '-p', binary=True))
    clicked = False
    for _ in range(5):
        xml = window()
        tree = ET.fromstring(xml)
        nodes = [n for n in tree.iter('node') if n.get('content-desc') == 'play']
        if nodes:
            x1, y1, x2, y2 = map(int, re.findall(r'\d+', nodes[0].get('bounds')))
            adb('shell', 'input', 'tap', str((x1+x2)//2), str((y1+y2)//2))
            clicked = True
            break
        adb('shell', 'input', 'swipe', '160', '480', '160', '200', '250')
    assert clicked, 'Play button not visible'
    xml = window()
    assert 'Нужен Minecraft Bedrock' in xml, 'No clear missing-game dialog'
    (OUT / 'bedrock-missing-smoke.png').write_bytes(adb('exec-out', 'screencap', '-p', binary=True))
    adb('shell', 'input', 'keyevent', '4')
    adb('shell', 'am', 'force-stop', PACKAGE)
    print('PASS: launcher starts independently; missing Minecraft handled without crashing.')
except Exception:
    import traceback
    details = traceback.format_exc() + '\n' + window()[:16000] + '\n' + adb('logcat', '-d', '-s', 'AndroidRuntime:E')[-12000:]
    print('::error title=Bedrock launcher smoke::' + details.replace('%', '%25').replace('\n', '%0A').replace('\r', '%0D'), flush=True)
    raise
finally:
    (OUT / 'bedrock-smoke-logcat.txt').write_text(adb('logcat', '-d', '-v', 'threadtime'))
