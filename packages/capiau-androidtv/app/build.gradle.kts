plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.capiau.streaming.tv"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.capiau.streaming.tv"
        minSdk = 21          // Android TV API 21+ (Lollipop)
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        // Jellyfin server URL — configurable at runtime
        buildConfigField("String", "JELLYFIN_SERVER_URL", "\"\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // === Android TV / Leanback ===
    implementation("androidx.leanback:leanback:1.2.0-alpha04")
    implementation("androidx.leanback:leanback-preference:1.2.0-alpha04")
    
    // === Core Android ===
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.activity:activity-ktx:1.8.2")
    implementation("androidx.fragment:fragment-ktx:1.6.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    
    // === ExoPlayer / Media3 (native video playback) ===
    implementation("androidx.media3:media3-exoplayer:1.2.1")
    implementation("androidx.media3:media3-exoplayer-hls:1.2.1")
    implementation("androidx.media3:media3-ui:1.2.1")
    implementation("androidx.media3:media3-session:1.2.1")
    
    // === Jellyfin SDK ===
    implementation("org.jellyfin.sdk:jellyfin-core:1.4.7")
    implementation("org.jellyfin.sdk:jellyfin-model:1.4.7")
    implementation("org.jellyfin.sdk:jellyfin-api:1.4.7")
    
    // === Firebase (native SDK — sync com web app) ===
    implementation(platform("com.google.firebase:firebase-bom:32.7.0"))
    implementation("com.google.firebase:firebase-firestore-ktx")
    implementation("com.google.firebase:firebase-auth-ktx")
    
    // === Networking ===
    implementation("io.coil-kt:coil:2.5.0")          // Image loading
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    
    // === Coroutines ===
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.7.3")
    
    // === WebView (for CapIAu Producer Mode bridge) ===
    implementation("androidx.webkit:webkit:1.9.0")
}
