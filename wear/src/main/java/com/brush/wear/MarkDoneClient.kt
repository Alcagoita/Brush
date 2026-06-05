/**
 * MarkDoneClient.kt — sends a mark-done message to the paired phone (KAN-38).
 *
 * Uses MessageClient (fire-and-forget RPC) to tell the phone which task the
 * user tapped on the watch. The phone's WearMessageListenerService receives
 * the message and updates Firestore. DataClient then pushes the authoritative
 * task list back to the watch, which reconciles with the optimistic update.
 */

package com.brush.wear

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.Wearable

object MarkDoneClient {

    private const val PATH = "/brush/mark-done"

    /**
     * Send a mark-done message for [taskId] to all connected phone nodes.
     * Silently no-ops if the phone is unreachable — the watch will retry
     * nothing; the optimistic update stays until the DataClient sync restores
     * the authoritative state.
     */
    fun send(context: Context, taskId: String) {
        try {
            Wearable.getNodeClient(context).connectedNodes
                .addOnSuccessListener { nodes ->
                    if (nodes.isEmpty()) {
                        Log.d("MarkDoneClient", "No connected nodes — message not sent")
                        return@addOnSuccessListener
                    }
                    val payload = taskId.toByteArray(Charsets.UTF_8)
                    for (node in nodes) {
                        Wearable.getMessageClient(context)
                            .sendMessage(node.id, PATH, payload)
                            .addOnFailureListener { e ->
                                Log.w("MarkDoneClient", "sendMessage to ${node.id} failed: ${e.message}")
                            }
                    }
                }
                .addOnFailureListener { e ->
                    Log.w("MarkDoneClient", "getConnectedNodes failed: ${e.message}")
                }
        } catch (e: Exception) {
            // Wearable API not available on this device — safe to ignore.
            Log.d("MarkDoneClient", "Wearable API unavailable: ${e.message}")
        }
    }
}
