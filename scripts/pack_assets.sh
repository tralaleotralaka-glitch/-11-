#!/usr/bin/env bash
# Копирует веб-приложение в assets Android-проекта и кладёт keystore.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf android/app/src/main/assets
mkdir -p android/app/src/main/assets
cp -r www/. android/app/src/main/assets/
cp android/debug.keystore android/app/debug.keystore

echo "assets готов:"
ls android/app/src/main/assets
echo "файлов: $(find android/app/src/main/assets -type f | wc -l)"
