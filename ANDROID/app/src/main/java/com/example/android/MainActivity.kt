package com.example.android

import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.OnBackPressedCallback

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val webView: WebView = findViewById(R.id.webview)
        // Enable JavaScript for the React app
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        
        // Ensure links open in the WebView
        webView.webViewClient = WebViewClient()

        // --- CONFIGURATION ---
        
        // Option 1: Production (Bundled Assets)
        // Use this when you have built the app and copied dist/ to main/assets/
        // val url = "file:///android_asset/index.html?teacherApp=1"
        
        // Option 2: Development (Hot Reloading)
        // Use 10.0.2.2 for Android Emulator to reach localhost:3000
        // If testing on a physical device, replace 10.0.2.2 with your PC's LAN IP (e.g., 192.168.1.50)
        val url = "http://192.168.29.188:3000?teacherApp=1" 

        // ---------------------

        webView.loadUrl(url)

        // Handle Back Navigation in WebView
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }
}
