/**
 * WearDataListenerService.kt — receives data and messages from the phone (KAN-35/36/38).
 *
 * DATA_CHANGED  /brush/tasks          → update TaskRepository (KAN-35)
 * MESSAGE       /brush/proximity-alert → show watch notification (KAN-36)
 * MESSAGE       /brush/mark-done-ack  → (reserved for future use)
 *
 * KAN-106: overrides onPeerConnected / onPeerDisconnected to track phone reachability
 * in ConnectivityRepository and flush the MarkDoneClient pending queue on reconnect.
 */

package com.brush.wear

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.WearableListenerService
import org.json.JSONObject

class WearDataListenerService : WearableListenerService() {

    companion object {
        private const val CHANNEL_ID   = "brush_proximity"
        private const val CHANNEL_NAME = "Nearby Task Alerts"
        private const val PATH_TASKS   = "/brush/tasks"
        private const val PATH_ALERT   = "/brush/proximity-alert"
    }

    // ── onCreate — create the notification channel once ──────────────────────────
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Alerts when a task-related place is nearby"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    // ── DataClient: task list sync (KAN-35) ───────────────────────────────────────
    override fun onDataChanged(events: DataEventBuffer) {
        events.forEach { event ->
            if (event.type == DataEvent.TYPE_CHANGED &&
                event.dataItem.uri.path == PATH_TASKS
            ) {
                val dataMap   = DataMapItem.fromDataItem(event.dataItem).dataMap
                val tasksJson = dataMap.getString("tasks") ?: return@forEach
                TaskRepository.updateFromJson(tasksJson)
            }
        }
    }

    // ── MessageClient: phone→watch messages (KAN-36) ──────────────────────────────
    override fun onMessageReceived(event: MessageEvent) {
        when (event.path) {
            PATH_ALERT -> handleProximityAlert(event.data)
        }
    }

    private fun handleProximityAlert(data: ByteArray) {
        try {
            val json      = JSONObject(String(data, Charsets.UTF_8))
            val title     = json.getString("title")
            val placeName = json.getString("placeName")
            val distance  = json.getString("distance")

            showWatchNotification(
                title = title,
                text  = "You're $distance from $placeName",
            )
        } catch (e: Exception) {
            android.util.Log.w("WearDataListenerService", "Bad proximity alert payload: ${e.message}")
        }
    }

    private fun showWatchNotification(title: String, text: String) {
        val notif = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_map)
            .setContentTitle(title)
            .setContentText(text)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        NotificationManagerCompat.from(this)
            .notify(System.currentTimeMillis().toInt(), notif)
    }

    // ── Node connectivity (KAN-106) ───────────────────────────────────────────────
    override fun onPeerConnected(peer: Node) {
        super.onPeerConnected(peer)
        ConnectivityRepository.setPhoneConnected(true)
        MarkDoneClient.flushPendingQueue(this)
    }

    override fun onPeerDisconnected(peer: Node) {
        super.onPeerDisconnected(peer)
        ConnectivityRepository.setPhoneConnected(false)
    }
}
