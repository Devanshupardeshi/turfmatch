import type { CapacitorConfig } from "@capacitor/cli"

/**
 * Capacitor wraps the Next.js static build into a native Android (and
 * iOS) shell so it can be packaged as an APK / AAB.
 *
 * Build flow (run on your local machine — not in the v0 sandbox):
 *   1. Add `output: 'export'` and `images.unoptimized: true` to next.config.mjs
 *   2. pnpm build                         (produces /out)
 *   3. pnpm cap sync android              (copies /out into the native project)
 *   4. pnpm cap open android              (opens Android Studio)
 *   5. Build → Generate Signed Bundle / APK
 *
 * The first time, also run:
 *   pnpm cap add android
 */
const config: CapacitorConfig = {
  appId: "com.turfmatch.app",
  appName: "TurfMatch",
  webDir: "out",
  // Android-specific defaults that match the dark theme.
  android: {
    backgroundColor: "#0c1324",
    allowMixedContent: false,
    // Enable chrome://inspect to attach to the WebView so we can read
    // the actual JS console + network errors during page load.
    webContentsDebuggingEnabled: true,
  },
  // Hide the white splash flash by drawing our own dark background.
  backgroundColor: "#0c1324",
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "432044680862-3cbspf7ou6dkads002ojeg61sn2fh5uv.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
  },
}

export default config
