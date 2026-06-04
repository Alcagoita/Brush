/**
 * WearSyncModule.kt — DataClient wrapper for Wear OS task sync (KAN-35).
 *
 * Exposes syncTasks(tasksJson) to React Native JS. Writes the task list to
 * the Wearable DataClient path "/brush/tasks" so the companion watch app can
 * receive it via WearDataListenerService.
 *
 * react-native-wear-connectivity covers MessageClient (used in KAN-38 for
 * mark-done). This module covers DataClient, which provides persistent
 * key-value storage that survives watch disconnections.
 */

package com.brush

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable

class WearSyncModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WearSyncModule"

    @ReactMethod
    fun syncTasks(tasksJson: String) {
        // Wrap entirely — the Wearable API is best-effort. If no watch is paired,
        // or if Play Services Wearable isn't initialised, we log and move on.
        // The phone app must never crash because the watch is absent.
        try {
            val putDataReq = PutDataMapRequest.create("/brush/tasks").apply {
                dataMap.putString("tasks", tasksJson)
                dataMap.putLong("updatedAt", System.currentTimeMillis())
            }.asPutDataRequest().setUrgent()

            Wearable.getDataClient(reactContext).putDataItem(putDataReq)
                .addOnFailureListener { e ->
                    android.util.Log.d("WearSyncModule", "No watch available: ${e.message}")
                }
        } catch (e: Exception) {
            android.util.Log.d("WearSyncModule", "Wearable API unavailable: ${e.message}")
        }
    }
}
