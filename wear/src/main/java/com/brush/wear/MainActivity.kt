/**
 * MainActivity.kt — Wear OS launcher activity stub (KAN-35).
 *
 * Full task list UI is implemented in KAN-37. This stub keeps the app
 * launchable and lets WearDataListenerService register and run correctly.
 */

package com.brush.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                val tasks by TaskRepository.tasks.collectAsState()
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    // Placeholder — full UI in KAN-37.
                    Text(text = "${tasks.size} tasks")
                }
            }
        }
    }
}
