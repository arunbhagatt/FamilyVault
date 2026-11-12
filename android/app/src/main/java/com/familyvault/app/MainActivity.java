package com.familyvault.app;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FamilyVaultBackupPlugin.class);
        super.onCreate(savedInstanceState);

        // Keep the WebView content below Android's status/notification bar,
        // including Android versions that enforce edge-to-edge by default.
        View webView = getBridge().getWebView();
        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars());
            view.setPadding(
                view.getPaddingLeft(),
                bars.top,
                view.getPaddingRight(),
                view.getPaddingBottom()
            );
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(webView);
    }
}
