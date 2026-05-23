package com.facebook.react.uimanager.layoutanimation;

import android.view.View;

/**
 * Compatibility stub — LayoutAnimationController was removed from
 * com.facebook.react.uimanager.layoutanimation in RN 0.76+.
 *
 * react-native-reanimated 3.x extends this class in its Paper (Old Arch)
 * layout animation path (ReaLayoutAnimator). On New Architecture (Fabric)
 * the subclass is instantiated but the reflection-based injection into
 * NativeViewHierarchyManager fails gracefully (NoSuchFieldException →
 * initOk = false), so none of these methods are ever dispatched at runtime.
 */
public class LayoutAnimationController {

  private boolean mLayoutAnimationEnabled = false;

  public boolean shouldAnimateLayout(View viewToAnimate) {
    return false;
  }

  public void reset() {}

  public void applyLayoutUpdate(View view, int x, int y, int width, int height) {
    view.layout(x, y, x + width, y + height);
  }

  public void deleteView(final View view, final LayoutAnimationListener listener) {
    if (listener != null) {
      listener.onAnimationEnd();
    }
  }

  public boolean isLayoutAnimationEnabled() {
    return mLayoutAnimationEnabled;
  }

  public void setLayoutAnimationEnabled(boolean enabled) {
    mLayoutAnimationEnabled = enabled;
  }
}
