package com.capiau.streaming.tv.data

import android.util.Log
import com.capiau.streaming.tv.CapIAuApp
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.tasks.await

/**
 * CapIAu Firebase Sync — Versão nativa Android
 * 
 * Equivalente Kotlin do capiauSync.js:
 * - Salva ordenações no Firestore + SharedPreferences (local cache)
 * - Listener real-time para receber mudanças de outros dispositivos
 * - Migração de dados locais → Firebase
 */
class CapIAuFirebaseSync private constructor() {

    private val TAG = "CapIAuSync"
    private val firestore = CapIAuApp.firestore
    private val collection = "capiau_custom_orders"
    
    private var listener: ListenerRegistration? = null
    private val callbacks = mutableListOf<(String, List<String>, String?) -> Unit>()

    /**
     * Salva a ordem personalizada — local + Firebase (async).
     */
    suspend fun save(
        entityType: String,
        entityId: String,
        orderedIds: List<String>,
        jellyfinUserId: String
    ) {
        // 1. Salva localmente (instantâneo)
        saveLocal(entityType, entityId, orderedIds)
        
        // 2. Salva no Firebase (async)
        try {
            val docId = "${jellyfinUserId}_${entityId}"
            val data = hashMapOf(
                "jellyfinUserId" to jellyfinUserId,
                "entityId" to entityId,
                "entityType" to entityType,
                "orderedList" to orderedIds,
                "deviceOrigin" to "androidtv-${android.os.Build.MODEL}",
                "updatedAt" to FieldValue.serverTimestamp()
            )
            
            firestore.collection(collection)
                .document(docId)
                .set(data, com.google.firebase.firestore.SetOptions.merge())
                .await()
            
            Log.d(TAG, "✅ Saved $entityType/$entityId → Firebase (${orderedIds.size} items)")
        } catch (e: Exception) {
            Log.w(TAG, "⚠️ Firebase save failed (local OK): ${e.message}")
        }
    }

    /**
     * Lê a ordem — tenta local primeiro, fallback Firebase.
     */
    suspend fun get(
        entityType: String,
        entityId: String,
        jellyfinUserId: String
    ): List<String>? {
        // 1. Tenta local
        val local = getLocal(entityType, entityId)
        if (!local.isNullOrEmpty()) return local
        
        // 2. Fallback Firebase
        return try {
            val docId = "${jellyfinUserId}_${entityId}"
            val doc = firestore.collection(collection)
                .document(docId)
                .get()
                .await()
            
            if (doc.exists()) {
                @Suppress("UNCHECKED_CAST")
                val orderedList = doc.get("orderedList") as? List<String> ?: emptyList()
                saveLocal(entityType, entityId, orderedList) // Cache
                Log.d(TAG, "📥 Loaded $entityType/$entityId from Firebase (${orderedList.size} items)")
                orderedList
            } else null
        } catch (e: Exception) {
            Log.w(TAG, "Firebase read failed: ${e.message}")
            null
        }
    }

    /**
     * Leitura síncrona do cache local (para rendering paths).
     */
    fun getLocal(entityType: String, entityId: String): List<String>? {
        val prefs = CapIAuApp.instance.getSharedPreferences("capiau_orders", 0)
        val key = if (entityType == "carousel") "capiau_carousel_order" else "capiau_order_$entityId"
        val json = prefs.getString(key, null) ?: return null
        
        return try {
            org.json.JSONArray(json).let { arr ->
                (0 until arr.length()).map { arr.getString(it) }
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun saveLocal(entityType: String, entityId: String, orderedIds: List<String>) {
        val prefs = CapIAuApp.instance.getSharedPreferences("capiau_orders", 0)
        val key = if (entityType == "carousel") "capiau_carousel_order" else "capiau_order_$entityId"
        val json = org.json.JSONArray(orderedIds).toString()
        prefs.edit().putString(key, json).apply()
    }

    /**
     * Inicia o listener real-time para receber mudanças de outros dispositivos.
     */
    fun startListener(jellyfinUserId: String, onUpdate: ((String, List<String>, String?) -> Unit)? = null) {
        if (onUpdate != null) callbacks.add(onUpdate)
        if (listener != null) return // Already listening

        listener = firestore.collection(collection)
            .whereEqualTo("jellyfinUserId", jellyfinUserId)
            .addSnapshotListener { snapshots, error ->
                if (error != null) {
                    Log.e(TAG, "Listener error: ${error.message}")
                    return@addSnapshotListener
                }

                snapshots?.documentChanges?.forEach { change ->
                    if (change.type == com.google.firebase.firestore.DocumentChange.Type.MODIFIED ||
                        change.type == com.google.firebase.firestore.DocumentChange.Type.ADDED) {
                        
                        val data = change.document.data
                        val entityId = data["entityId"] as? String ?: return@forEach
                        val entityType = data["entityType"] as? String ?: "collection"
                        @Suppress("UNCHECKED_CAST")
                        val orderedList = data["orderedList"] as? List<String> ?: emptyList()
                        val deviceOrigin = data["deviceOrigin"] as? String

                        // Update local cache
                        saveLocal(entityType, entityId, orderedList)

                        // Notify callbacks
                        callbacks.forEach { cb ->
                            try {
                                cb(entityId, orderedList, deviceOrigin)
                            } catch (e: Exception) {
                                Log.e(TAG, "Callback error: ${e.message}")
                            }
                        }

                        Log.d(TAG, "🔄 Real-time update: $entityType/$entityId from $deviceOrigin")
                    }
                }
            }

        Log.i(TAG, "🎧 Real-time sync listener started")
    }

    /**
     * Para o listener real-time.
     */
    fun stopListener() {
        listener?.remove()
        listener = null
        callbacks.clear()
        Log.i(TAG, "🔇 Listener stopped")
    }

    companion object {
        @Volatile
        private var instance: CapIAuFirebaseSync? = null

        fun getInstance(): CapIAuFirebaseSync {
            return instance ?: synchronized(this) {
                instance ?: CapIAuFirebaseSync().also { instance = it }
            }
        }
    }
}
