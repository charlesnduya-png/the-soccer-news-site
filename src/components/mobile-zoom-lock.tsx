"use client";

import { useEffect } from "react";

/**
 * iOS Safari often ignores viewport user-scalable=no.
 * This blocks pinch/gesture zoom and double-tap zoom more reliably.
 */
export function MobileZoomLock() {
  useEffect(() => {
    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    // Safari gesture events (pinch zoom)
    document.addEventListener("gesturestart", preventGesture, { passive: false });
    document.addEventListener("gesturechange", preventGesture, { passive: false });
    document.addEventListener("gestureend", preventGesture, { passive: false });

    // Multi-touch pinch fallback
    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };
    document.addEventListener("touchmove", preventMultiTouch, { passive: false });

    // Stop double-tap zoom
    let lastTouchEnd = 0;
    const preventDoubleTap = (event: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    };
    document.addEventListener("touchend", preventDoubleTap, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("gestureend", preventGesture);
      document.removeEventListener("touchmove", preventMultiTouch);
      document.removeEventListener("touchend", preventDoubleTap);
    };
  }, []);

  return null;
}
