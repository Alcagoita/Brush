/**
 * WearMessageListenerService.kt — receives MessageClient messages from the
 * Wear OS companion app (KAN-38).
 *
 * Handles the "/brush/mark-done" path:
 *   1. Reads the task ID from the message payload.
 *   2. Gets the current user's UID from FirebaseAuth.
 *   3. Updates users/{uid}/tasks/{taskId} in Firestore directly (no RN bridge
 *      needed — the Firebase Android SDK is already initialised by RNFBApp).
 *
 * The existing Firestore subscription in useTodayScreen (JS) picks up the
 * change automatically and calls syncTasksToWatch(), which pushes the updated
 * list back to the watch via DataClient.
 *
 * Note: point awarding on watch-side mark-done is not implemented here — the
 * JS subscription in useTodayScreen handles that for phone-initiated toggles.
 * A future ticket can extend this service to fire the award.
 */

package com.brush

import android.util.Log
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore

class WearMessageListenerService : WearableListenerService() {

    companion object {
        private const val TAG              = "WearMsgService"
        private const val PATH_MARK_DONE   = "/brush/mark-done"
    }

    override fun onMessageReceived(event: MessageEvent) {
        when (event.path) {
            PATH_MARK_DONE -> handleMarkDone(event.data)
        }
    }

    private fun handleMarkDone(data: ByteArray) {
        val taskId = String(data, Charsets.UTF_8).trim()
        if (taskId.isEmpty()) {
            Log.w(TAG, "mark-done received empty taskId — ignoring")
            return
        }

        val uid = FirebaseAuth.getInstance().currentUser?.uid
        if (uid == null) {
            Log.w(TAG, "mark-done ignored — no authenticated user")
            return
        }

        FirebaseFirestore.getInstance()
            .collection("users").document(uid)
            .collection("tasks").document(taskId)
            .update(
                mapOf(
                    "done"        to true,
                    "completedAt" to FieldValue.serverTimestamp(),
                )
            )
            .addOnSuccessListener {
                Log.d(TAG, "mark-done sync completed")
            }
            .addOnFailureListener { e ->
                Log.w(TAG, "mark-done sync failed: ${e.message}")
            }
    }
}
