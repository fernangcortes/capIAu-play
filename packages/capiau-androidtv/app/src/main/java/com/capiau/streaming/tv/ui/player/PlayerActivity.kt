package com.capiau.streaming.tv.ui.player

import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import androidx.fragment.app.FragmentActivity
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.capiau.streaming.tv.R
import com.capiau.streaming.tv.data.JellyfinConnection

/**
 * PlayerActivity — Player de vídeo nativo com ExoPlayer/Media3
 * 
 * Usa playback nativo (Direct Play) para máxima performance em TVs Android.
 * O Jellyfin server fornece o stream URL e o ExoPlayer faz o decode via hardware.
 * 
 * Teclas do controle remoto:
 * - Play/Pause: ▶️/⏸️
 * - Seek: ◀️ -10s / ▶️ +10s
 * - Stop/Back: Volta para a home
 * - Menu/Info: Abre Modo Produtora (sidebar com anotações)
 */
class PlayerActivity : FragmentActivity() {

    private var player: ExoPlayer? = null
    private lateinit var playerView: PlayerView
    private val connection by lazy { JellyfinConnection.getInstance(this) }

    private var mediaId: String = ""
    private var mediaName: String = ""
    private var startPositionMs: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_player)

        playerView = findViewById(R.id.player_view)

        mediaId = intent.getStringExtra("MEDIA_ID") ?: ""
        mediaName = intent.getStringExtra("MEDIA_NAME") ?: ""
        startPositionMs = intent.getLongExtra("START_POSITION_MS", 0)

        if (mediaId.isEmpty()) {
            Log.e("CapIAu", "No media ID provided")
            finish()
            return
        }

        initPlayer()
    }

    private fun initPlayer() {
        player = ExoPlayer.Builder(this)
            .build()
            .also { exoPlayer ->
                playerView.player = exoPlayer

                // Build the stream URL from Jellyfin
                val streamUrl = buildStreamUrl(mediaId)
                val mediaItem = MediaItem.fromUri(streamUrl)

                exoPlayer.setMediaItem(mediaItem)
                exoPlayer.playWhenReady = true
                
                if (startPositionMs > 0) {
                    exoPlayer.seekTo(startPositionMs)
                }
                
                exoPlayer.prepare()

                exoPlayer.addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(playbackState: Int) {
                        when (playbackState) {
                            Player.STATE_ENDED -> {
                                Log.i("CapIAu", "Playback finished: $mediaName")
                                finish()
                            }
                            Player.STATE_READY -> {
                                Log.i("CapIAu", "Playing: $mediaName")
                            }
                        }
                    }
                })
            }
    }

    private fun buildStreamUrl(mediaId: String): String {
        val serverUrl = connection.serverUrl.trimEnd('/')
        val token = connection.accessToken
        // Direct Play URL — Jellyfin will serve the original file
        return "$serverUrl/Videos/$mediaId/stream?Static=true&api_key=$token"
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        val p = player ?: return super.onKeyDown(keyCode, event)

        return when (keyCode) {
            // Play/Pause toggle
            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
            KeyEvent.KEYCODE_DPAD_CENTER -> {
                if (p.isPlaying) p.pause() else p.play()
                true
            }

            KeyEvent.KEYCODE_MEDIA_PLAY -> {
                p.play()
                true
            }

            KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                p.pause()
                true
            }

            // Seek backward -10s
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_MEDIA_REWIND -> {
                p.seekTo(maxOf(0, p.currentPosition - 10_000))
                true
            }

            // Seek forward +10s
            KeyEvent.KEYCODE_DPAD_RIGHT,
            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> {
                p.seekTo(minOf(p.duration, p.currentPosition + 10_000))
                true
            }

            // Stop → go back
            KeyEvent.KEYCODE_MEDIA_STOP,
            KeyEvent.KEYCODE_BACK -> {
                p.stop()
                finish()
                true
            }

            // Menu/Info → open Producer Mode sidebar
            KeyEvent.KEYCODE_MENU,
            KeyEvent.KEYCODE_INFO,
            KeyEvent.KEYCODE_PROG_RED -> { // Red button on remote
                openProducerMode()
                true
            }

            else -> super.onKeyDown(keyCode, event)
        }
    }

    private fun openProducerMode() {
        val intent = android.content.Intent(this, 
            com.capiau.streaming.tv.ui.producer.ProducerActivity::class.java).apply {
            putExtra("MEDIA_ID", mediaId)
            putExtra("MEDIA_NAME", mediaName)
            putExtra("CURRENT_POSITION_MS", player?.currentPosition ?: 0)
        }
        startActivity(intent)
    }

    override fun onPause() {
        super.onPause()
        player?.pause()
    }

    override fun onResume() {
        super.onResume()
        player?.play()
    }

    override fun onDestroy() {
        super.onDestroy()
        player?.release()
        player = null
    }
}
