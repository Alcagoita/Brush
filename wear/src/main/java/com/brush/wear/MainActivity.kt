/**
 * MainActivity.kt — Wear OS launcher activity (KAN-37).
 *
 * Entry point for the Brush watch companion. Renders the TaskListScreen,
 * which observes TaskRepository.tasks and displays the synced task list.
 *
 * Task data flows: phone → WearSyncModule → DataClient → WearDataListenerService
 * → TaskRepository (StateFlow) → TaskListScreen (recompose on update).
 *
 * Mark-done interaction (tap on task row) is implemented in KAN-38.
 */

package com.brush.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.brush.wear.ui.TaskListScreen

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            TaskListScreen()
        }
    }
}
