# Windows 11 — Android APK 11.5

Оболочка Windows 11 для Android 7.0+. Minecraft в меню «Пуск» открывает
официальную установленную игру (`com.mojang.minecraftpe`) отдельным приложением.
Если игра не установлена, предлагается перейти в Google Play. Minecraft нужно
приобрести отдельно; его файлы и лицензия в APK не входят. Java Edition не запускается.

## Сборка
GitHub Actions → Build APK. Готовый Windows11.apk доступен в артефакте
Windows11-APK и релизе apk-latest. Используется прежний ключ подписи для обновления.

## Проверка
`npm ci && npm test`
