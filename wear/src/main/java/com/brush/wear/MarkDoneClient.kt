/**
 * MarkDoneClient.kt — sends a mark-done message to the paired phone (KAN-38).
 *
 * Uses MessageClient (fire-and-forget RPC) to tell the phone which task the
 * user tapped on the watch. The phone's WearMessageListenerService receives
 * the message and updates Firestore. DataClient then pushes the authoritative
 * task list back to the watch, which reconciles with the optimistic update.
 *
 * KAN-106: if no phone nodes are reachable, the task ID is queued in-memory.
 * flushPendingQueue() is called by WearDataListenerService when the phone
 * reconnects, delivering all queued mark-done messages in order.
 */

package com.brush.wear

import android.content.Context
import android.util.Log
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.Wearable
import java.util.concurrent.ConcurrentLinkedDeque
import java.util.concurrent.atomic.AtomicBoolean

object MarkDoneClient {

    private const val PATH = "/brush/mark-done"
    // ConcurrentLinkedDeque — accessed from UI thread, Wearable API callbacks, and service callbacks.
    private val pendingQueue = ConcurrentLinkedDeque<String>()

    /**
     * Send a mark-done message for [taskId] to all connected phone nodes.
     * If no nodes are reachable the task ID is queued for retry on reconnect.
     */
    fun send(context: Context, taskId: String) {
        try {
            Wearable.getNodeClient(context).connectedNodes
                .addOnSuccessListener { nodes ->
                    if (nodes.isEmpty()) {
                        Log.d("MarkDoneClient", "No connected nodes — queuing $taskId")
                        pendingQueue.addLast(taskId)
                        return@addOnSuccessListener
                    }
                    sendToNodes(context, nodes, taskId)
                }
                .addOnFailureListener { e ->
                    Log.w("MarkDoneClient", "getConnectedNodes failed, queuing $taskId: ${e.message}")
                    pendingQueue.addLast(taskId)
                }
        } catch (e: Exception) {
            // Wearable API not available on this device — safe to ignore.
            Log.d("MarkDoneClient", "Wearable API unavailable: ${e.message}")
        }
    }

    /**
     * Deliver all queued mark-done messages now that the phone is reachable.
     * Called by WearDataListenerService.onPeerConnected().
     * Uses poll() loop to drain atomically — avoids toList()+clear() race.
     */
    fun flushPendingQueue(context: Context) {
        if (pendingQueue.isEmpty()) return
        try {
            Wearable.getNodeClient(context).connectedNodes
                .addOnSuccessListener { nodes ->
                    if (nodes.isEmpty()) return@addOnSuccessListener
                    var count = 0
                    var taskId = pendingQueue.poll()
                    while (taskId != null) {
                        sendToNodes(context, nodes, taskId)
                        count++
                        taskId = pendingQueue.poll()
                    }
                    Log.d("MarkDoneClient", "Flushed $count queued message(s) on reconnect")
                }
        } catch (e: Exception) {
            Log.d("MarkDoneClient", "Wearable API unavailable during flush: ${e.message}")
        }
    }

    private fun sendToNodes(context: Context, nodes: List<Node>, taskId: String) {
        val payload  = taskId.toByteArray(Charsets.UTF_8)
        val requeued = AtomicBoolean(false)
        for (node in nodes) {
            Wearable.getMessageClient(context)
                .sendMessage(node.id, PATH, payload)
                .addOnFailureListener { e ->
                    Log.w("MarkDoneClient", "sendMessage to ${node.id} failed: ${e.message}")
                    // Re-queue once per send attempt regardless of how many nodes failed.
                    if (requeued.compareAndSet(false, true)) {
                        pendingQueue.addLast(taskId)
                    }
                }
        }
    }
}
