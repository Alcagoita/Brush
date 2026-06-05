/**
 * BrushWearTheme.kt — Wear OS theme for the Brush companion app (KAN-37).
 *
 * Maps the Brush design tokens to Wear OS MaterialTheme. Watches are always
 * dark-mode, so we only define a dark palette here.
 */

package com.brush.wear.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Colors

// ─── Brush design tokens (dark mode) ─────────────────────────────────────────

val BrushDark = Colors(
    primary         = Color(0xFFD4955A),  // accent (dark)
    primaryVariant  = Color(0xFFE8A86A),  // accent (light)
    secondary       = Color(0xFFD4955A),
    background      = Color(0xFF0E0E0C),  // bg dark
    surface         = Color(0xFF171715),  // surface dark
    error           = Color(0xFFE05252),
    onPrimary       = Color(0xFF0E0E0C),
    onSecondary     = Color(0xFF0E0E0C),
    onBackground    = Color(0xFFF6F5F2),  // text dark
    onSurface       = Color(0xFFF6F5F2),
    onError         = Color(0xFFF6F5F2),
)

// ─── Category colours (shared with phone app) ────────────────────────────────

fun categoryColor(category: String): Color = when (category) {
    "work"     -> Color(0xFF5B7FD4)
    "health"   -> Color(0xFF5BA87A)
    "errands"  -> Color(0xFF8B6BC4)
    "personal" -> Color(0xFFE8A86A)
    else       -> Color(0xFF8A8A85)
}

// ─── Theme wrapper ────────────────────────────────────────────────────────────

@Composable
fun BrushWearTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colors  = BrushDark,
        content = content,
    )
}
