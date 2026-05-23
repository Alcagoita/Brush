package com.facebook.react.uimanager;

/**
 * Compatibility stub — UIManagerModuleListener was removed from RN 0.76+.
 *
 * react-native-reanimated 3.x implements this interface in ReanimatedModule
 * for the Paper (Old Arch) dispatch path. On New Architecture (Fabric) the
 * Fabric UIManagerListener interface is used instead; this stub exists only
 * to satisfy the compiler.
 */
public interface UIManagerModuleListener {
  void willDispatchViewUpdates(UIManagerModule uiManager);
}
