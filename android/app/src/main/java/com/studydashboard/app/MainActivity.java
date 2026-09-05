package com.studydashboard.app;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        /*
         * Make the hardware/gesture back button walk back through the dashboard's
         * own history instead of closing the app on the first press.
         *
         * Capacitor's Bridge does not handle back itself, so without this the
         * system default applies and back would exit from any section. Doing it
         * here rather than through @capacitor/app keeps the dependency list to
         * what the app actually needs.
         */
        getOnBackPressedDispatcher()
            .addCallback(
                this,
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        WebView webView = getBridge() != null ? getBridge().getWebView() : null;

                        if (webView != null && webView.canGoBack()) {
                            webView.goBack();
                            return;
                        }

                        // Nothing left in history: stand down and let the system
                        // close the activity as it normally would.
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                    }
                }
            );
    }
}
