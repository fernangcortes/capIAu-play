package com.capiau.streaming.tv.ui.main

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.capiau.streaming.tv.data.CapIAuFirebaseSync
import com.capiau.streaming.tv.data.JellyfinConnection
import com.capiau.streaming.tv.databinding.ActivityMainBinding
import com.capiau.streaming.tv.ui.setup.ServerSetupActivity
import kotlinx.coroutines.launch

/**
 * MainActivity — Tela principal do CapIAu Android TV
 * 
 * Se o servidor Jellyfin não estiver configurado, redireciona para setup.
 * Caso contrário, carrega o BrowseFragment (home com carrosséis Leanback)
 * e inicia o listener Firebase para sync multi-device.
 */
class MainActivity : FragmentActivity() {

    private lateinit var binding: ActivityMainBinding
    private val connection by lazy { JellyfinConnection.getInstance(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (!connection.isConfigured) {
            startActivity(Intent(this, ServerSetupActivity::class.java))
            finish()
            return
        }

        // Load the home screen
        if (savedInstanceState == null) {
            supportFragmentManager.beginTransaction()
                .replace(android.R.id.content, HomeFragment())
                .commit()
        }

        // Start Firebase real-time sync
        initSync()
    }

    private fun initSync() {
        val userId = connection.userId
        if (userId.isNotEmpty()) {
            val sync = CapIAuFirebaseSync.getInstance()
            sync.startListener(userId) { entityId, orderedList, deviceOrigin ->
                Log.d("CapIAu", "🔄 Sync update: $entityId from $deviceOrigin (${orderedList.size} items)")
                // Re-render carousels if on home screen
                runOnUiThread {
                    val fragment = supportFragmentManager.findFragmentById(android.R.id.content)
                    if (fragment is HomeFragment) {
                        fragment.refreshCarousels()
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        CapIAuFirebaseSync.getInstance().stopListener()
    }
}
