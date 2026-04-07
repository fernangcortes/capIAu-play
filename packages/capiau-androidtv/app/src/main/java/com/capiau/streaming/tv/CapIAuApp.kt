package com.capiau.streaming.tv

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.firestore.FirebaseFirestore

/**
 * CapIAu Android TV Application
 * 
 * Inicializa Firebase e Jellyfin SDK no boot do app.
 */
class CapIAuApp : Application() {

    companion object {
        lateinit var instance: CapIAuApp
            private set

        // Firebase Firestore instance (shared)
        lateinit var firestore: FirebaseFirestore
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this

        // Initialize Firebase
        FirebaseApp.initializeApp(this)
        firestore = FirebaseFirestore.getInstance()

        android.util.Log.i("CapIAu", "🎬 CapIAu Android TV initialized")
    }
}
