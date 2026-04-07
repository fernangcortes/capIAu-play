package com.capiau.streaming.tv.ui.setup

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.capiau.streaming.tv.R
import com.capiau.streaming.tv.data.JellyfinConnection
import com.capiau.streaming.tv.ui.main.MainActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jellyfin.sdk.api.client.extensions.userApi

/**
 * ServerSetupActivity — Configuração inicial do servidor Jellyfin
 * 
 * Tela de first-run para conectar ao servidor.
 * Suporta navegação por D-pad (tab entre campos + Enter para conectar).
 */
class ServerSetupActivity : FragmentActivity() {

    private lateinit var inputUrl: EditText
    private lateinit var inputUser: EditText
    private lateinit var inputPass: EditText
    private lateinit var btnConnect: Button
    private lateinit var statusText: TextView

    private val connection by lazy { JellyfinConnection.getInstance(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_setup)

        inputUrl = findViewById(R.id.input_server_url)
        inputUser = findViewById(R.id.input_username)
        inputPass = findViewById(R.id.input_password)
        btnConnect = findViewById(R.id.btn_connect)
        statusText = findViewById(R.id.status_text)

        // Pre-fill if configured before
        if (connection.serverUrl.isNotEmpty()) {
            inputUrl.setText(connection.serverUrl)
        }
        if (connection.userName.isNotEmpty()) {
            inputUser.setText(connection.userName)
        }

        btnConnect.setOnClickListener { attemptLogin() }

        // Focus the URL field on launch
        inputUrl.requestFocus()
    }

    private fun attemptLogin() {
        val url = inputUrl.text.toString().trim()
        val username = inputUser.text.toString().trim()
        val password = inputPass.text.toString()

        if (url.isEmpty() || username.isEmpty()) {
            statusText.text = "Preencha URL e usuário"
            return
        }

        statusText.text = getString(R.string.connecting)
        btnConnect.isEnabled = false

        lifecycleScope.launch {
            try {
                val api = withContext(Dispatchers.IO) {
                    val jf = org.jellyfin.sdk.createJellyfin {
                        clientInfo = org.jellyfin.sdk.model.ClientInfo(
                            name = "CapIAu Android TV",
                            version = "1.0.0"
                        )
                    }
                    val tempApi = jf.createApi(baseUrl = url)

                    // Authenticate
                    val authResult = tempApi.userApi.authenticateUserByName(
                        username = username,
                        pw = password
                    )
                    authResult
                }

                // Save credentials
                val result = api.content
                connection.serverUrl = url
                connection.accessToken = result.accessToken ?: ""
                connection.userId = result.user?.id?.toString() ?: ""
                connection.userName = username

                Log.i("CapIAu", "✅ Connected to Jellyfin as ${result.user?.name}")

                // Navigate to main
                startActivity(Intent(this@ServerSetupActivity, MainActivity::class.java))
                finish()

            } catch (e: Exception) {
                Log.e("CapIAu", "Login failed", e)
                statusText.text = getString(R.string.error_connection) + ": ${e.message}"
                btnConnect.isEnabled = true
            }
        }
    }
}
