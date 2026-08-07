"use client";

import { useEffect } from "react";

/** Tells Shopify theme iframe that the hub loaded successfully. */
export function IframeBridge() {
  useEffect(() => {
    if (window.parent === window) return;

    const ping = () => {
      window.parent.postMessage({ type: "SOCCER_HUB_READY" }, "*");
    };

    ping();
    const timer = window.setInterval(ping, 2000);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
