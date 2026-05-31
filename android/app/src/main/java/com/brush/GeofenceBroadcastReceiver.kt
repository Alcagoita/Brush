/**
 * GeofenceBroadcastReceiver.kt — Handles Android geofence transition events (KAN-56).
 *
 * Receives GEOFENCE_TRANSITION_ENTER broadcasts from GeofencingClient and
 * forwards each triggered geofence ID to BrushGeofenceModule, which emits
 * the 'onGeofenceEntry' event to JS.
 */

package com.brush

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.ReactApplication
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofenceStatusCodes
import com.google.android.gms.location.GeofencingEvent

class GeofenceBroadcastReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val geofencingEvent = GeofencingEvent.fromIntent(intent) ?: return

        if (geofencingEvent.hasError()) {
            val errorCode = geofencingEvent.errorCode
            android.util.Log.e(
                "GeofenceBroadcastReceiver",
                "Geofence error: ${GeofenceStatusCodes.getStatusCodeString(errorCode)}"
            )
            return
        }

        if (geofencingEvent.geofenceTransition != Geofence.GEOFENCE_TRANSITION_ENTER) {
            return // we only care about entry events
        }

        val triggeredGeofences = geofencingEvent.triggeringGeofences ?: return

        // Forward each triggered geofence to the JS layer via BrushGeofenceModule.
        val reactApp = context.applicationContext as? ReactApplication ?: return
        val reactContext = reactApp.reactNativeHost.reactInstanceManager.currentReactContext
            ?: return

        val geofenceModule = reactContext
            .getNativeModule(BrushGeofenceModule::class.java)
            ?: return

        for (geofence in triggeredGeofences) {
            geofenceModule.sendGeofenceEntryEvent(geofence.requestId)
        }
    }
}
