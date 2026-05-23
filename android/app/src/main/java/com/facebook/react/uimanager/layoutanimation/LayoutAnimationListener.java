package com.facebook.react.uimanager.layoutanimation;

/**
 * Compatibility stub — LayoutAnimationListener was removed from
 * com.facebook.react.uimanager.layoutanimation in RN 0.76+.
 *
 * react-native-reanimated 3.x still compiles against it in its Paper (Old Arch)
 * code path; on New Architecture (Fabric) this interface is never invoked at
 * runtime, but the class must be present for compilation to succeed.
 */
public interface LayoutAnimationListener {
  void onAnimationEnd();
}
