"use client";

import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * Native platform wiring. Renders nothing.
 *
 * Everything here is a no-op in a browser — the component is inert unless the
 * page is running inside the Capacitor WebView, so the web build behaves exactly
 * as it did before.
 */
export function NativeShell() {
  const { resolvedTheme } = useTheme();

  // Dismiss the splash once the web layer has actually painted. `launchAutoHide`
  // is off in capacitor.config.ts, so without this the splash would never go.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    // Two frames: the first commits this render, the second paints it.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) void SplashScreen.hide();
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the status bar icons legible against whichever theme is active.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !resolvedTheme) return;

    void (async () => {
      try {
        // Draw under the status bar; the app shell pads itself back out using
        // `env(safe-area-inset-top)`, which is what gives the edge-to-edge look.
        await StatusBar.setOverlaysWebView({ overlay: true });
        // `Style.Dark` means light icons (for a dark background) and vice versa.
        await StatusBar.setStyle({
          style: resolvedTheme === "dark" ? Style.Dark : Style.Light,
        });
      } catch {
        // Older WebViews can reject these; a wrong-coloured status bar is not
        // worth taking the app down for.
      }
    })();
  }, [resolvedTheme]);

  return null;
}
