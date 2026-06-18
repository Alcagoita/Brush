/**
 * TaskListScreen.kt — Wear OS task list UI (KAN-37).
 *
 * Displays the undone tasks synced from the phone via WearSyncModule /
 * WearDataListenerService. Observes TaskRepository.tasks (StateFlow).
 *
 * Layout:
 *   ScalingLazyColumn (handles round-screen edge scaling automatically)
 *     ├── [Banner]    — "Phone disconnected" when phone unreachable (KAN-106)
 *     ├── Title chip  — "Today"
 *     ├── Task rows   — category dot + title + ⚠ if pendingSync (KAN-106)
 *     └── Footer text — "{n} left" or "All done ✓"
 *
 * Empty / waiting state: centred "No tasks yet" message.
 *
 * Tap on a task row is a no-op here — mark-done is implemented in KAN-38.
 */

package com.brush.wear.ui

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.items
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import com.brush.wear.ConnectivityRepository
import com.brush.wear.MarkDoneClient
import com.brush.wear.TaskRepository
import com.brush.wear.WatchTask

@Composable
fun TaskListScreen() {
    val tasks          by TaskRepository.tasks.collectAsState()
    val phoneConnected by ConnectivityRepository.phoneConnected.collectAsState()

    BrushWearTheme {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colors.background),
        ) {
            if (tasks.isEmpty()) {
                EmptyState(phoneConnected = phoneConnected)
            } else {
                TaskList(tasks = tasks, phoneConnected = phoneConnected)
            }
        }
    }
}

// ─── Disconnect banner ────────────────────────────────────────────────────────

@Composable
private fun DisconnectBanner() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colors.surface.copy(alpha = 0.7f))
            .padding(horizontal = 12.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text  = "Phone disconnected",
            color = MaterialTheme.colors.onBackground.copy(alpha = 0.6f),
            style = MaterialTheme.typography.caption2,
        )
    }
}

// ─── Empty state ──────────────────────────────────────────────────────────────

@Composable
private fun EmptyState(phoneConnected: Boolean) {
    Column(
        modifier          = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (!phoneConnected) {
            DisconnectBanner()
        }
        Box(
            modifier          = Modifier.weight(1f),
            contentAlignment  = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text  = "No tasks yet",
                    color = MaterialTheme.colors.onBackground,
                    style = MaterialTheme.typography.body1,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text  = "Open Brush on your phone",
                    color = MaterialTheme.colors.onBackground.copy(alpha = 0.5f),
                    style = MaterialTheme.typography.caption2,
                )
            }
        }
    }
}

// ─── Task list ────────────────────────────────────────────────────────────────

@Composable
private fun TaskList(tasks: List<WatchTask>, phoneConnected: Boolean) {
    val remaining = tasks.count { !it.done }
    val context   = LocalContext.current

    ScalingLazyColumn(
        modifier            = Modifier.fillMaxSize(),
        contentPadding      = PaddingValues(horizontal = 8.dp, vertical = 32.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        // ── Disconnect banner ──
        if (!phoneConnected) {
            item { DisconnectBanner() }
        }

        // ── Title ──
        item {
            Text(
                text     = "Today",
                color    = MaterialTheme.colors.onBackground,
                style    = MaterialTheme.typography.title3,
                modifier = Modifier.padding(bottom = 4.dp),
            )
        }

        // ── Task rows ──
        items(tasks) { task ->
            TaskRow(task = task, context = context)
        }

        // ── Footer ──
        item {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text  = if (remaining == 0) "All done ✓" else "$remaining left",
                color = if (remaining == 0)
                    MaterialTheme.colors.primary
                else
                    MaterialTheme.colors.onBackground.copy(alpha = 0.5f),
                style = MaterialTheme.typography.caption2,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}

// ─── Task row ─────────────────────────────────────────────────────────────────

@Composable
private fun TaskRow(task: WatchTask, context: Context) {
    val isDone        = task.done
    val dotColor      = categoryColor(task.category)
    val textAlpha     = if (isDone) 0.4f else 1f
    val hapticFeedback = LocalHapticFeedback.current

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(12.dp))
            .clickable(enabled = !isDone) {
                // Tactile confirmation — fires before the state update so the
                // user feels the tap even if the optimistic update takes a frame.
                hapticFeedback.performHapticFeedback(HapticFeedbackType.LongPress)
                // Optimistic update — mark done locally immediately.
                TaskRepository.markDoneOptimistic(task.id)
                // Fire-and-forget message to the phone.
                MarkDoneClient.send(context, task.id)
            }
            .padding(horizontal = 4.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Category dot
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(dotColor.copy(alpha = textAlpha)),
        )

        Spacer(modifier = Modifier.width(10.dp))

        // Task title
        Text(
            text           = task.title,
            color          = MaterialTheme.colors.onBackground.copy(alpha = textAlpha),
            style          = MaterialTheme.typography.body2.copy(
                fontSize        = 14.sp,
                textDecoration  = if (isDone) TextDecoration.LineThrough else TextDecoration.None,
            ),
            maxLines        = 2,
            overflow        = TextOverflow.Ellipsis,
            modifier        = Modifier.weight(1f),
        )

        // Pending-sync indicator — shown after 5s without DataClient reconciliation (KAN-106)
        if (task.pendingSync) {
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text  = "!",
                color = MaterialTheme.colors.primary.copy(alpha = 0.7f),
                style = MaterialTheme.typography.caption1,
            )
        }
    }
}
