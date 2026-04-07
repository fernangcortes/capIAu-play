package com.capiau.streaming.tv.data

import android.content.Context
import android.content.SharedPreferences
import org.jellyfin.sdk.Jellyfin
import org.jellyfin.sdk.api.client.ApiClient
import org.jellyfin.sdk.createJellyfin
import org.jellyfin.sdk.model.ClientInfo

/**
 * Gerencia a conexão com o servidor Jellyfin.
 * Armazena URL e credenciais no SharedPreferences.
 */
class JellyfinConnection private constructor(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("capiau_jellyfin", Context.MODE_PRIVATE)

    private val jellyfin: Jellyfin = createJellyfin {
        clientInfo = ClientInfo(
            name = "CapIAu Android TV",
            version = "1.0.0"
        )
    }

    var serverUrl: String
        get() = prefs.getString("server_url", "") ?: ""
        set(value) = prefs.edit().putString("server_url", value).apply()

    var accessToken: String
        get() = prefs.getString("access_token", "") ?: ""
        set(value) = prefs.edit().putString("access_token", value).apply()

    var userId: String
        get() = prefs.getString("user_id", "") ?: ""
        set(value) = prefs.edit().putString("user_id", value).apply()

    var userName: String
        get() = prefs.getString("user_name", "") ?: ""
        set(value) = prefs.edit().putString("user_name", value).apply()

    val isConfigured: Boolean
        get() = serverUrl.isNotEmpty() && accessToken.isNotEmpty()

    /**
     * Cria um ApiClient conectado ao servidor Jellyfin configurado.
     */
    fun createApiClient(): ApiClient? {
        if (!isConfigured) return null
        return jellyfin.createApi(
            baseUrl = serverUrl,
            accessToken = accessToken
        )
    }

    companion object {
        @Volatile
        private var instance: JellyfinConnection? = null

        fun getInstance(context: Context): JellyfinConnection {
            return instance ?: synchronized(this) {
                instance ?: JellyfinConnection(context.applicationContext).also {
                    instance = it
                }
            }
        }
    }
}
