# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# ─── Firebase ────────────────────────────────────────────────────────────────
# Keep only the app-specific pieces that still need help beyond the SDKs'
# bundled consumer rules. Broad Firebase/Play Services keeps block R8 from
# shrinking and obfuscating release artifacts effectively.

# Firebase Auth
-keepattributes Signature
-keepattributes *Annotation*

# Firebase Messaging
-keep class com.google.firebase.messaging.** { *; }

# Firebase Storage
-keep class com.google.firebase.storage.** { *; }

# Prevent stripping of React Native Firebase bridge classes
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**
