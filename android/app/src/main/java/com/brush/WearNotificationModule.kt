/**
 * WearNotificationModule.kt — forwards proximity alerts to the paired Wear OS
 * watch via MessageClient (KAN-36).
 *
 * Called from JS (proximity.ts) immediately after the phone notifee notification
 * fires. Uses fire-and-forget MessageClient — correct for latency-sensitive alerts
 * where delivery confirmation is unnecessary. If no watch is paired or reachable,
 * the failure is logged silently so the phone experience is never affected.
 *
 * Message path: /brush/proximity-alert
 * Payload (UTF-8 JSON): { "title": "…", "placeName": "…", "distance": "…" }
 */

package com.brush

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.wearable.Wearable
import org.json.JSONObject

class WearNotificationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG  = "WearNotificationModule"
        private const val PATH = "/brush/proximity-alert"
    }

    override fun getName() = "WearNotificationModule"

    /**
     * Send a proximity alert to all connected Wear OS nodes.
     * Fire-and-forget — does not block the JS thread.
     */
    @ReactMethod
    fun sendProximityAlert(title: String, placeName: String, distance: String) {
        val payload = JSONObject().apply {
            put("title",     title)
            put("placeName", placeName)
            put("distance",  distance)
        }.toString().toByteArray(Charsets.UTF_8)

        Wearable.getNodeClient(reactContext).connectedNodes
            .addOnSuccessListener { nodes ->
                if (nodes.isEmpty()) {
                    Log.d(TAG, "No connected watch nodes — skipping proximity alert")
                    return@addOnSuccessListener
                }
                nodes.forEach { node ->
                    Wearable.getMessageClient(reactContext)
                        .sendMessage(node.id, PATH, payload)
                        .addOnSuccessListener {
                            Log.d(TAG, "Proximity alert sent to ${node.displayName}")
                        }
                        .addOnFailureListener { e ->
                            Log.w(TAG, "Failed to send alert to ${node.displayName}: ${e.message}")
                        }
                }
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "Could not query connected nodes: ${e.message}")
            }
    }
}
