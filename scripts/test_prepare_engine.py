import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile
from prepare_engine import prepare, A, PIN

PROJECT = Path(__file__).resolve().parents[1]


class PrepareEngineTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.engine = self.root / 'engine'
        self.app = self.engine / 'app_pojavlauncher'
        self.main = self.app / 'src/main'
        (self.main / 'res/values').mkdir(parents=True)
        (self.main / 'res/drawable').mkdir()
        (self.app / 'build.gradle').write_text('''
namespace 'net.kdt.pojavlaunch'
applicationId "net.kdt.pojavlaunch"
minSdkVersion 21
versionCode getDateSeconds()
versionName getVersionName()
applicationIdSuffix '.debug'
resValue 'string', 'application_package', 'net.kdt.pojavlaunch.debug'
resValue 'string', 'storageProviderAuthorities', 'net.kdt.pojavlaunch.scoped.gamefolder.debug'
resValue 'string', 'shareProviderAuthority', 'net.kdt.pojavlaunch.scoped.controlfolder.debug'
resValue 'string', 'storageProviderAuthorities', 'net.kdt.pojavlaunch.scoped.gamefolder'
''')
        (self.main / 'AndroidManifest.xml').write_text('''<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:name=".PojavApplication"><activity android:name=".TestStorageActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity><activity android:name=".MainActivity" android:process=":game"/></application></manifest>''')
        (self.main / 'res/values/strings.xml').write_text('<resources><string name="app_name">Pojav</string><string name="app_short_name">Pojav</string></resources>')
        self.apk = self.root / 'runtime.apk'
        with ZipFile(self.apk, 'w') as apk:
            for name in ('jre', 'jre-new', 'jre-21'):
                for filename in ('version', 'universal.tar.xz', 'bin-arm64.tar.xz'):
                    apk.writestr(f'assets/components/{name}/{filename}', b'fixture')
            apk.writestr('classes.dex', b'NEVER COPY')
            apk.writestr('lib/arm64-v8a/libpojavexec.so', b'NEVER COPY')

    def tearDown(self):
        self.temp.cleanup()

    def test_keeps_single_in_app_launcher_and_game(self):
        prepare(self.engine, self.apk, PROJECT)
        manifest = ET.parse(self.main / 'AndroidManifest.xml')
        app = manifest.getroot().find('application')
        self.assertEqual('.PojavApplication', app.get(A + 'name'))
        entries = [x for x in app.findall('activity') if x.find('intent-filter') is not None]
        self.assertEqual(1, len(entries))
        self.assertEqual('.TestStorageActivity', entries[0].get(A + 'name'))
        self.assertEqual('true', entries[0].get(A + 'exported'))
        self.assertFalse(any('HomeActivity' in x.get(A + 'name', '') for x in app.findall('activity')))
        self.assertFalse((self.main / 'java/com/arena/javalauncher/HomeActivity.java').exists())
        self.assertTrue(any(x.get(A + 'process') == ':game' for x in app.findall('activity')))
        gradle = (self.app / 'build.gradle').read_text()
        self.assertIn('applicationId "com.arena.win11"', gradle)
        self.assertIn("namespace 'net.kdt.pojavlaunch'", gradle)
        self.assertIn('versionCode 11', gradle)
        self.assertEqual((PROJECT / 'android/debug.keystore').read_bytes(), (self.app / 'debug.keystore').read_bytes())
        self.assertFalse((self.main / 'classes.dex').exists())
        self.assertFalse((self.main / 'lib').exists())
        self.assertEqual(PIN, json.loads((self.main / 'assets/project_provenance.json').read_text())['source_commit'])
        self.assertTrue((self.main / 'assets/project_licenses/LGPL-3.0.txt').is_file())
        self.assertIn('1.12.2', (self.main / 'assets/launcher_profiles.json').read_text())

    def test_refuses_external_or_changed_launcher_entry(self):
        manifest = self.main / 'AndroidManifest.xml'
        manifest.write_text(manifest.read_text().replace('.TestStorageActivity', '.UnexpectedActivity'))
        with self.assertRaisesRegex(ValueError, 'in-APK bootstrap'):
            prepare(self.engine, self.apk, PROJECT)

    def test_refuses_missing_runtime(self):
        with ZipFile(self.apk, 'w') as apk:
            apk.writestr('assets/components/jre/version', 'test')
        with self.assertRaisesRegex(ValueError, 'Missing runtime'):
            prepare(self.engine, self.apk, PROJECT)

    def test_refuses_traversal(self):
        with ZipFile(self.apk, 'w') as apk:
            apk.writestr('assets/components/jre/../../../../escape', 'test')
        with self.assertRaisesRegex(ValueError, 'Unsafe runtime'):
            prepare(self.engine, self.apk, PROJECT)
        self.assertFalse((self.root / 'escape').exists())

    def test_refuses_drifted_engine(self):
        (self.app / 'build.gradle').write_text('unexpected upstream code')
        with self.assertRaisesRegex(ValueError, 'Pinned upstream build changed'):
            prepare(self.engine, self.apk, PROJECT)


if __name__ == '__main__':
    unittest.main()
