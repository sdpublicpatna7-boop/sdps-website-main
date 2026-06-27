package org.sdpublic.qpbuilder;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Prevent screenshots and screen recording
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        // Eliminate white flash on page changes by matching the app's dark theme color (#090D16)
        this.bridge.getWebView().setBackgroundColor(android.graphics.Color.parseColor("#090D16"));
    }
}
