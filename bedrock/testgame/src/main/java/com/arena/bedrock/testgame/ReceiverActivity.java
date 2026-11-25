package com.arena.bedrock.testgame;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import java.io.InputStream;

/** Intent contract test stub, not game code. Kept out of the distributable APK. */
public final class ReceiverActivity extends Activity {
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Intent source = getIntent();
        boolean readable = false;
        if (source.getData() != null && "content".equals(source.getData().getScheme())) {
            try (InputStream stream = getContentResolver().openInputStream(source.getData())) {
                readable = stream != null && stream.read() == 'P' && stream.read() == 'K';
            } catch (Exception ignored) { }
        }
        TextView label = new TextView(this);
        label.setText("TEST RECEIVER — NOT MINECRAFT\n" + source.getAction() + "\n" + source.getData());
        setContentView(label);
        Intent result = new Intent("com.arena.bedrock.TEST_RESULT");
        result.setPackage("com.arena.bedrock.test");
        result.putExtra("action", source.getAction());
        result.putExtra("uri", source.getDataString());
        result.putExtra("mime", source.getType());
        result.putExtra("readable", readable);
        result.putExtra("flags", source.getFlags());
        sendBroadcast(result);
    }
}
