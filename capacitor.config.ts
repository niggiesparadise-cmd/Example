import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.studydashboard.app",
  appName: "Study Dashboard",

  /**
   * Capacitor packages whatever is in here as the app's web assets. It is the
   * Next.js static export, unchanged — `npm run build` writes it, `npx cap sync`
   * copies it into `android/app/src/main/assets/public`.
   */
  webDir: "out",

  android: {
    /**
     * Serve over `https://localhost` rather than `file://`.
     *
     * The export references assets by absolute path (`/_next/...`), which only
     * resolves under a real origin; `file://` would also give the WebView an
     * opaque origin, breaking the `localStorage` the theme toggle persists to.
     */
    webContentsDebuggingEnabled: false,
  },

  server: {
    androidScheme: "https",
    hostname: "localhost",

    /**
     * Left at its default (`true`) deliberately.
     *
     * Capacitor's asset server serves the root `index.html` for any path whose
     * last segment has no file extension, so `/courses/` cannot resolve to
     * `courses/index.html` — that branch runs before the asset handler, and the
     * `RouteProcessor` hook it exposes is only handed the literal `/index.html`.
     * Setting it to `false` is worse, not better: extensionless paths then match
     * no handler at all and the WebView shows an error page.
     *
     * This costs nothing in practice. The app cold-starts at `/`, and every
     * in-app link is a client-side App Router transition, so all seven sections
     * work. Only a WebView reload returns to Overview — which is how a phone app
     * is expected to restart anyway. See README "Android limitations".
     */
    // html5mode: true
  },

  plugins: {
    SplashScreen: {
      /**
       * Hold the splash until the web layer says it has painted
       * (`SplashScreenGate` calls `hide()`), instead of dropping it the moment
       * the activity draws — otherwise there is a white flash while the WebView
       * boots and hydrates.
       */
      launchAutoHide: false,
      backgroundColor: "#f7f7f7",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
