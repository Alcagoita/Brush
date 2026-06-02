/**
 * BrushGeofenceModule.kt — Native geofence wrapper for Android (KAN-56).
 *
 * Wraps GeofencingClient (Google Play Services) so React Native JS can
 * register and remove circular geofences without a third-party library.
 *
 * Supports:
 *   - registerGeofence(id, lat, lng, radiusMeters)
 *   - removeGeofence(id)
 *   - removeAllGeofences()
 *   - Emits 'onGeofenceEntry' to JS via GeofenceBroadcastReceiver
 *
 * Android limits: 100 geofences per app. With ≤10 POI types in practice
 * this limit is not a concern.
 *
 * Note: ACCESS_BACKGROUND_LOCATION is required on Android 10+ for background
 * geofence callbacks. This permission is already requested in geolocation.ts
 * (KAN-22).
 */

package com.brush

import android.app.PendingIntent
import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.location.*

class BrushGeofenceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val geofencingClient: GeofencingClient =
        LocationServices.getGeofencingClient(reactContext)

    private val geofencePendingIntent: PendingIntent by lazy {
        val intent = Intent(reactContext, GeofenceBroadcastReceiver::class.java)
        PendingIntent.getBroadcast(
            reactContext,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
    }

    override fun getName() = "BrushGeofenceModule"

    // ── JS-callable methods ───────────────────────────────────────────────────

    @ReactMethod
    fun registerGeofence(
        id: String,
        lat: Double,
        lng: Double,
        radiusMeters: Double,
        promise: Promise,
    ) {
        val geofence = Geofence.Builder()
            .setRequestId(id)
            .setCircularRegion(lat, lng, radiusMeters.toFloat())
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER)
            .build()

        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofence(geofence)
            .build()

        geofencingClient.addGeofences(request, geofencePendingIntent)
            .addOnSuccessListener { promise.resolve(null) }
            .addOnFailureListener { e -> promise.reject("GEOFENCE_ERROR", e.message, e) }
    }

    @ReactMethod
    fun removeGeofence(id: String, promise: Promise) {
        geofencingClient.removeGeofences(listOf(id))
            .addOnSuccessListener { promise.resolve(null) }
            .addOnFailureListener { e -> promise.reject("GEOFENCE_ERROR", e.message, e) }
    }

    @ReactMethod
    fun removeAllGeofences(promise: Promise) {
        geofencingClient.removeGeofences(geofencePendingIntent)
            .addOnSuccessListener { promise.resolve(null) }
            .addOnFailureListener { e -> promise.reject("GEOFENCE_ERROR", e.message, e) }
    }

    // ── Event emitter ─────────────────────────────────────────────────────────

    /**
     * Called by GeofenceBroadcastReceiver when a GEOFENCE_TRANSITION_ENTER
     * event is received. Forwards the geofence ID to JS.
     */
    fun sendGeofenceEntryEvent(geofenceId: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onGeofenceEntry", Arguments.createMap().apply {
                putString("geofenceId", geofenceId)
            })
    }

    // Required by RCTEventEmitter interface
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
