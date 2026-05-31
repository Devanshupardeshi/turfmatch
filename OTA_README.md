# TurfMatch OTA (APK Sideload) — Operator Guide

End-to-end APK-based over-the-air update system. Replaces the previous JS-bundle Capgo flow.

## Architecture at a Glance

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│  Admin Panel (turf-match-admin) │        │  Supabase                        │
│   - /updates  drag-drop APK     │ uploads│   apk-releases bucket (public)   │
│   - Activate / Archive / etc.   │───────▶│   app_versions table             │
│   - GET /api/version.json       │        │   apk_install_attempts table     │
└─────────┬───────────────────────┘        │   device_update_state table      │
          │  serves manifest                └──────────────────────────────────┘
          ▼
┌─────────────────────────────────┐
│  Android client (Capacitor)     │
│  ApkUpdaterPlugin (native Java) │
│   - Range-resumable download    │
│   - SHA-256 verify              │
│   - System installer intent     │
│  ApkUpdaterProvider (React)     │
│   - Force-update gate           │
│   - Glassmorphism modal         │
└─────────────────────────────────┘
```

## One-Time Setup

### 1. Vercel env (admin)

In the `turf-match-admin` Vercel project, add `SUPABASE_SERVICE_ROLE_KEY`
(Project Settings → Environment Variables). This is required for the
admin upload pipeline.

### 2. Rebuild & reinstall the Android shell

Because we added the native `ApkUpdaterPlugin` (Java) and new manifest
permissions, you must reinstall the app on every test device. JS-only
OTA will never reach these clients.

```powershell
cd c:\Users\devan\Downloads\turf-match-app-build
pnpm install
pnpm exec next build
pnpm exec cap sync android
pnpm exec cap open android
```

In Android Studio: **Build → Generate Signed Bundle / APK → APK**, use
your release keystore, choose `release` variant, build.

Install the freshly-signed APK on a device once. From here on, all
updates are delivered OTA — no manual reinstall.

### 3. Pin the signing fingerprint (optional, recommended)

Inside Android Studio, find the SHA-256 of your release certificate:

```powershell
keytool -list -v -keystore your-release.keystore | findstr SHA256
```

Copy the hex (strip the colons). You'll paste it into the admin upload
form under "Signing fingerprint (sha256)" to detect any tampered APK
sneaking through the CDN.

## Publishing an Update

Every release follows the same loop:

### Step 1 — Bump versionCode + versionName

Edit `android/app/build.gradle`:

```gradle
defaultConfig {
    ...
    versionCode 2          // ← increment by 1 each release
    versionName "1.0.1"    // ← semver
}
```

Android **requires** `versionCode` to be strictly greater than the
installed version. The OTA check uses this number first, falling back
to semver only if `versionCode` is missing.

### Step 2 — Build the signed APK

```powershell
pnpm exec next build
pnpm exec cap sync android
# Android Studio → Build → Generate Signed APK → release
```

The APK ends up at `android/app/release/app-release.apk`.

### Step 3 — Upload via admin panel

1. Visit `https://turf-match-admin.vercel.app/updates`.
2. Drag the APK into the dropzone.
3. Fill in:
   - **Version**: `1.0.1` (semver, matches `versionName`)
   - **versionCode**: `2` (matches gradle)
   - **Channel**: `stable` / `beta` / `dev`
   - **Rollout %**: `100` (or lower for staged rollout)
   - **Mandatory**: tick to force-update — users cannot dismiss
   - **Min Android SDK**: `24` (Android 7.0+)
   - **Signing fingerprint** (optional but recommended)
   - **Release notes**: visible in the modal
   - **Activate immediately**: yes
4. Click **Publish APK**.

The browser computes SHA-256 client-side, uploads the APK straight to
Supabase Storage via signed URL (bypassing Vercel's 4.5 MB API limit),
and then activates the row. Older `active` rows on the same channel
are auto-archived.

### Step 4 — Verify on a device

- Open the app. Within 0–30 seconds the modal appears.
- For mandatory updates the entire UI is blurred and locked.
- Tap **Download** → progress ring + speed + ETA.
- After SHA verification, tap **Install now**.
- First time only: Android prompts you to allow "Install unknown apps"
  for TurfMatch. Tap **Open settings** in the modal, toggle it on, come
  back, tap **Install now**.
- The system installer takes over. Approve the install — Android
  replaces the app in-place; signed-by-same-cert so user data persists.

## Rollback / Mid-flight Controls

The `/updates` dashboard has per-version buttons:

| Action          | What it does |
|-----------------|--------------|
| **Activate**    | Mark this version active; auto-archive the previously active one on the same channel. |
| **Archive**     | Stop serving this version. Clients on it keep running. |
| **Rollback to** | Atomically swap: current active → `rollback` status, this version → `active`. |
| **Mandatory**   | Toggle force-update. Mandatory updates ignore staged rollout %. |
| **Rollout %**   | Inline edit. Devices are bucketed deterministically by `deviceId`, so a device that gets the update never loses it on a percentage shrink. |
| **Delete**      | Removes the row AND deletes the APK from Storage. Use sparingly. |

## What the Client Does, Step by Step

1. **App launch** (`AppBootstrapProvider`) — peeks the manifest so the splash can show "Update available".
2. **Shell render** (`ApkUpdaterProvider`) — registers a 30-minute foreground poll, an `appStateChange` listener (re-check on resume), and a Capacitor `progress` listener.
3. **fetchApkManifest()** queries `/api/version.json` with `versionCode`, `currentVersion`, `sdk`, `channel`, `deviceId`. Server applies semver/SDK/rollout filtering.
4. If `updateAvailable: true`, the modal opens. Mandatory ⇒ `ForceUpdateGate` blurs and inert-locks the rest of the app.
5. On **Download**:
   - Free-space check (1.5× APK size)
   - Network connectivity check
   - `apk_install_attempts` row inserted in Supabase
   - `ApkUpdater.download()` (native Java) streams the file to `cacheDir/updates/update.apk` with HTTP `Range` resume + SHA-256 verification
   - Progress events at ~4 Hz feed the ring/percent/speed/ETA UI
6. On **Install**:
   - `canRequestInstallPackages()` checked first
   - If denied, modal shows the **Permission needed** panel with **Open settings**
   - Otherwise `Intent.ACTION_INSTALL_PACKAGE` is fired with a `content://…/fileprovider` URI; Android installer takes over
7. After the install completes the app is killed by the system. On next launch, `getCurrentVersion()` now reports the new `versionCode`, the manifest endpoint returns `updateAvailable: false`, and the cached APK is auto-deleted.

## Edge Cases Handled

- **Interrupted download** — partial file stays on disk; next check resumes via HTTP `Range`. Hash mismatch wipes and retries.
- **Hash mismatch** — file deleted, attempt marked `failed` with `Checksum mismatch (…)` error, retry button.
- **Low storage** — pre-flight free-space check; clear error.
- **Install permission denied** — distinct UI state; deep-link to the per-app settings page on Android 8+.
- **Mandatory bypass** — `inert` attribute + pointer-events: none on children. Tabs, gestures, back button — all neutered.
- **Stale dismissal** — the dismissed `versionId` is forgotten as soon as a *different* version is offered.
- **CORS / WebView origin** — `OPTIONS` preflight + `Access-Control-Allow-Origin: *` on the version endpoint.
- **Vercel 4.5 MB upload limit** — admin uses signed-upload URLs; APK never touches the API layer.
- **Tampering** — optional `apk_signing_sha256` pinning in the manifest; client compares to the actual install certificate via `getCurrentVersion().signingSha256`.

## Database Tables

- `app_versions` — extended with `apk_url`, `apk_size_bytes`, `apk_sha256`, `apk_version_code`, `apk_signing_sha256`, `min_android_sdk`, `storage_object_path`.
- `apk_install_attempts` — one row per device-version attempt. `outcome` flows `started → downloading → downloaded → installing → installed | failed | cancelled`.
- `device_update_state` — legacy table, still used for boot-health tracking. Anon `SELECT/INSERT/UPDATE` policies added.

## Files Touched

```
android/app/src/main/java/com/turfmatch/app/
  ApkUpdaterPlugin.java          ← native plugin (download / verify / install)
  MainActivity.java              ← registers ApkUpdaterPlugin
android/app/src/main/AndroidManifest.xml ← REQUEST_INSTALL_PACKAGES permission
android/app/src/main/res/xml/file_paths.xml ← cache-path for FileProvider

lib/ota/
  apk-updater.ts                 ← TS bridge to native plugin
  apk-manifest.ts                ← fetch + types
  apk-analytics.ts               ← Supabase install attempts
  use-apk-updater.tsx            ← provider + hook

components/ota/
  update-modal.tsx               ← glassmorphism progress UI
  force-update-gate.tsx          ← inert blocker

components/turfmatch/app-shell.tsx ← wired ApkUpdaterProvider + ForceUpdateGate
lib/bootstrap/app-bootstrap.tsx   ← uses new manifest peek

turf-match-admin/lib/admin-apk.ts ← admin server actions
turf-match-admin/app/updates/page.tsx ← redesigned dashboard
turf-match-admin/app/updates/_components/{upload-form,version-actions}.tsx
turf-match-admin/app/api/version.json/route.ts ← APK manifest endpoint
```

## Cleanup You Can Do Later (Not Required)

- Remove the `@capgo/capacitor-updater` dependency from `package.json` — the new flow doesn't use it.
- Delete `lib/ota/use-updater.ts`, `lib/ota/update-manager.ts`, `lib/ota/rollback-manager.ts`, `lib/turfmatch/use-updater.tsx` — superseded by the APK files above.
- Drop the old `app-bundles` Supabase Storage bucket if you no longer host JS bundles there.
