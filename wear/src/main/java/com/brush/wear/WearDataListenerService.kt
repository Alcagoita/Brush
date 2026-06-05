/**
 * WearDataListenerService.kt — receives task data from the phone (KAN-35).
 *
 * Listens for DATA_CHANGED events on "/brush/tasks". When the phone pushes a
 * new task list via WearSyncModule.syncTasks(), this service parses the JSON
 * and updates TaskRepository, which the watch UI (KAN-37) observes.
 *
 * onMessageReceived is a stub — KAN-38 will use it for mark-done acknowledgements.
 */

package com.brush.wear

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.WearableListenerService

class WearDataListenerService : WearableListenerService() {

    override fun onDataChanged(events: DataEventBuffer) {
        events.forEach { event ->
            if (event.type == DataEvent.TYPE_CHANGED &&
                event.dataItem.uri.path == "/brush/tasks"
            ) {
                val dataMap  = DataMapItem.fromDataItem(event.dataItem).dataMap
                val tasksJson = dataMap.getString("tasks") ?: return@forEach
                TaskRepository.updateFromJson(tasksJson)
            }
        }
    }

    override fun onMessageReceived(event: MessageEvent) {
        // The watch sends mark-done messages (KAN-38) — it does not receive them.
        // No inbound message handling needed on the watch side.
    }
}
