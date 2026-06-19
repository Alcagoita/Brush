/**
 * ConnectivityRepository.kt — tracks whether the paired phone is reachable (KAN-106).
 *
 * Updated by WearDataListenerService via onPeerConnected / onPeerDisconnected.
 * Consumed by TaskListScreen to show the "Phone disconnected" banner.
 */

package com.brush.wear

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

object ConnectivityRepository {

    private val _phoneConnected = MutableStateFlow(true) // optimistic default
    val phoneConnected: StateFlow<Boolean> = _phoneConnected

    fun setPhoneConnected(connected: Boolean) {
        _phoneConnected.value = connected
    }
}
