# CapIAu Android TV - ProGuard Rules

# Keep Jellyfin SDK models
-keep class org.jellyfin.sdk.model.** { *; }

# Keep Firebase Firestore
-keep class com.google.firebase.firestore.** { *; }

# Keep ExoPlayer
-keep class androidx.media3.** { *; }

# Keep CapIAu classes
-keep class com.capiau.streaming.tv.** { *; }

# Keep WebView JavaScript interface
-keepclassmembers class com.capiau.streaming.tv.ui.producer.ProducerActivity$NativeBridge {
    public *;
}

# Keep Coil image loader
-keep class coil.** { *; }
