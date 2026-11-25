package com.arena.javalauncher;

import android.app.Activity;
import android.app.AlertDialog;
import android.os.Bundle;
import android.os.Build;
import android.content.Intent;
import android.graphics.Color;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** Project-owned entry screen. The game runtime/renderer is the credited Pojav engine. */
public final class HomeActivity extends Activity {
    private LinearLayout content;

    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        int pad = (int)(10 * getResources().getDisplayMetrics().density);
        view.setPadding(0, pad, 0, pad);
        content.addView(view);
        return view;
    }

    private Button button(String label, View.OnClickListener action) {
        Button button = new Button(this);
        button.setText(label);
        button.setOnClickListener(action);
        content.addView(button);
        return button;
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        int white = Color.rgb(237, 243, 240);
        int green = Color.rgb(121, 211, 134);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        int p = (int)(24 * getResources().getDisplayMetrics().density);
        content.setPadding(p, p, p, p);
        content.setBackgroundColor(Color.rgb(17, 23, 25));
        text("JAVA LAUNCHER / 0.4", 14, green);
        text("Minecraft: Java Edition", 28, white);
        text("Теперь с игровым движком", 20, green);
        text("В APK включены Android Java runtime, графический мост и сенсорное управление PojavLauncher. Это не Bedrock и не веб-имитация.", 16, white);
        button("Открыть игровое меню", view -> {
            try {
                Intent intent = new Intent();
                intent.setClassName(this, "net.kdt.pojavlaunch.TestStorageActivity");
                startActivity(intent);
            } catch (RuntimeException e) {
                new AlertDialog.Builder(this).setTitle("Ошибка открытия движка")
                    .setMessage(e.toString()).setPositiveButton("OK", null).show();
            }
        });
        text("Первый запуск", 20, green);
        text("1. Откройте игровое меню кнопкой ниже. Дождитесь распаковки Java.\n2. Выберите аккаунт. Для серверов с проверкой аккаунта нужен вход Microsoft и владение игрой. Локальный профиль не является лицензией.\n3. Создайте профиль версии. Для первой проверки рекомендуется Vanilla 1.12.2, Java 8 и GL4ES.\n4. Нажмите «Играть» и дождитесь загрузки файлов. Нужны интернет и свободное место.", 16, white);
        text("Android " + Build.VERSION.RELEASE + " · " + android.text.TextUtils.join(", ", Build.SUPPORTED_ABIS), 13, white);
        text("Совместимость зависит от GPU, драйвера, версии Minecraft и памяти телефона. На физическом телефоне эта сборка ещё не проверена. Современные версии и моды могут требовать другой renderer/runtime.", 14, white);
        button("Авторы и исходный код", view -> new AlertDialog.Builder(this)
            .setTitle("Открытые компоненты")
            .setMessage("Стартовый экран и сборка: этот проект.\n\nИгровой движок: PojavLauncherTeam / PojavLauncher, LGPL-3.0, commit 6b0ff501cc5fc8fe79d29ecd2244192a2f66e6c7.\nJava runtime: OpenJDK Android builds проекта PojavLauncher.\n\nЭто производная сборка, а не полностью новый движок. Она не связана с Mojang или Microsoft.\n\nИсходники и лицензии доступны в приложенном к релизу архиве JavaLauncher-0.4-sources.zip и репозитории tralaleotralaka-glitch/-11-.")
            .setPositiveButton("OK", null).show());
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.addView(content);
        setContentView(scroll);
    }
}
