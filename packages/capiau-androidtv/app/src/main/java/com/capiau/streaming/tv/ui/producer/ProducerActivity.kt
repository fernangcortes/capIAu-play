package com.capiau.streaming.tv.ui.producer

import android.annotation.SuppressLint
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.webkit.*
import androidx.fragment.app.FragmentActivity
import com.capiau.streaming.tv.R
import com.capiau.streaming.tv.data.JellyfinConnection

/**
 * ProducerActivity — Modo Produtora via WebView Bridge
 * 
 * Carrega os módulos JavaScript CapIAu (capiauSidebar, capiauDragDrop, firebaseConfig)
 * dentro de um WebView, reutilizando 100% do código web existente.
 * 
 * Isso evita reescrever toda a UI de anotações/notas em Kotlin.
 * O WebView recebe contexto do player nativo via JavaScript interface.
 * 
 * Arquitetura:
 * ┌──────────────────────────────────────────┐
 * │         ProducerActivity (Kotlin)        │
 * │                                          │
 * │  ┌──────────────────────────────────┐    │
 * │  │          WebView                 │    │
 * │  │  ┌────────────────────────────┐  │    │
 * │  │  │   capiauSidebar.js         │  │    │
 * │  │  │   capiauDragDrop.js        │  │    │
 * │  │  │   firebaseConfig.js        │  │    │
 * │  │  │   capiauSync.js            │  │    │
 * │  │  └────────────────────────────┘  │    │
 * │  │                                  │    │
 * │  │  window.CapIAuNative ←→ Kotlin   │    │
 * │  └──────────────────────────────────┘    │
 * └──────────────────────────────────────────┘
 */
class ProducerActivity : FragmentActivity() {

    private lateinit var webView: WebView
    private val connection by lazy { JellyfinConnection.getInstance(this) }

    private var mediaId: String = ""
    private var mediaName: String = ""
    private var currentPositionMs: Long = 0

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_producer)

        mediaId = intent.getStringExtra("MEDIA_ID") ?: ""
        mediaName = intent.getStringExtra("MEDIA_NAME") ?: ""
        currentPositionMs = intent.getLongExtra("CURRENT_POSITION_MS", 0)

        webView = findViewById(R.id.producer_webview)
        setupWebView()
        loadProducerUI()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true    // localStorage for CapIAu modules
            databaseEnabled = true
            allowFileAccess = true
            mediaPlaybackRequiresUserGesture = false
            useWideViewPort = true
            loadWithOverviewMode = true
        }

        // Bridge: Kotlin ←→ JavaScript
        webView.addJavascriptInterface(NativeBridge(), "CapIAuNative")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Inject context data after page loads
                injectContext()
            }
        }

        webView.webChromeClient = WebChromeClient()
    }

    private fun loadProducerUI() {
        // Load the Jellyfin web interface with CapIAu modules
        // The sidebar will auto-initialize via initCapIAuSidebar()
        val serverUrl = connection.serverUrl.trimEnd('/')
        val token = connection.accessToken

        // Load the main Jellyfin web UI → sidebar auto-injects
        webView.loadUrl("$serverUrl/web/index.html#/details?id=$mediaId")

        // Set auth headers
        val headers = mapOf(
            "Authorization" to "MediaBrowser Token=\"$token\""
        )
        webView.loadUrl("$serverUrl/web/index.html#/details?id=$mediaId", headers)
    }

    private fun injectContext() {
        // Pass native context to the CapIAu JavaScript modules
        val js = """
            (function() {
                // Inform CapIAu modules that we're running inside Android TV WebView
                window.__CAPIAU_ANDROID_TV__ = true;
                window.__CAPIAU_MEDIA_ID__ = '$mediaId';
                window.__CAPIAU_MEDIA_NAME__ = '${mediaName.replace("'", "\\'")}';
                window.__CAPIAU_POSITION_MS__ = $currentPositionMs;
                
                // Auto-open sidebar after a short delay
                setTimeout(function() {
                    var fab = document.getElementById('capiau-fab');
                    if (fab && !document.getElementById('capiau-sidebar').classList.contains('is-open')) {
                        fab.click();
                    }
                }, 2000);
                
                console.log('[CapIAu Android TV] Producer mode context injected');
            })();
        """.trimIndent()

        webView.evaluateJavascript(js, null)
    }

    /**
     * JavaScript Interface — métodos chamáveis pelo JS via window.CapIAuNative.*
     */
    inner class NativeBridge {
        
        @JavascriptInterface
        fun getMediaId(): String = mediaId

        @JavascriptInterface
        fun getMediaName(): String = mediaName

        @JavascriptInterface
        fun getCurrentPositionMs(): Long = currentPositionMs

        @JavascriptInterface
        fun getServerUrl(): String = connection.serverUrl

        @JavascriptInterface
        fun getAccessToken(): String = connection.accessToken

        @JavascriptInterface
        fun getUserId(): String = connection.userId

        @JavascriptInterface
        fun log(message: String) {
            Log.d("CapIAu-WebView", message)
        }

        @JavascriptInterface
        fun navigateToPlayer(mediaId: String, positionMs: Long) {
            runOnUiThread {
                val intent = android.content.Intent(
                    this@ProducerActivity,
                    com.capiau.streaming.tv.ui.player.PlayerActivity::class.java
                ).apply {
                    putExtra("MEDIA_ID", mediaId)
                    putExtra("START_POSITION_MS", positionMs)
                }
                startActivity(intent)
                finish()
            }
        }

        @JavascriptInterface
        fun closeProducer() {
            runOnUiThread { finish() }
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        return when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                if (webView.canGoBack()) {
                    webView.goBack()
                    true
                } else {
                    finish()
                    true
                }
            }
            else -> super.onKeyDown(keyCode, event)
        }
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
