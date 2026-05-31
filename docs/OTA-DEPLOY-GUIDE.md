# How to Push OTA Updates — Complete Guide

## Method 1: Fully Automated (GitHub Actions) — RECOMMENDED

### Step 1: Add your GitHub repo secrets

Go to GitHub → Your repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret name | Value |
|-------------|-------|
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key (starts with `eyJhbGci...`) |

### Step 2: Create Supabase Storage bucket

In Supabase Dashboard → Storage → New bucket:
- Name: `app-bundles`
- Public bucket: YES (required for mobile app downloads)

### Step 3: Trigger a deploy

**Option A — Auto-deploy on push:**
```bash
git add .
git commit -m "feat: new features"
git push origin main
```

**Option B — Manual deploy with options:**
1. Go to GitHub → Your repo → Actions → "OTA Deploy"
2. Click "Run workflow"
3. Select channel (dev/beta/stable)
4. Set rollout % (e.g. 10 for 10% of users)
5. Check "Mandatory" if you want to force update
6. Click "Run workflow"

### What happens automatically:
1. Builds your Next.js app (`npm run build`)
2. Exports static bundle (`npm run export`)
3. Bumps `package.json` version (patch)
4. Zips the `out/` folder
5. Computes SHA256 checksum
6. Uploads to Supabase Storage (`app-bundles/app-v1.2.4.zip`)
7. Inserts row into `app_versions` table with status = active
8. Commits version bump back to repo

---

## Method 2: Manual Deploy (Right Now)

### Step 1: Build your app
```powershell
cd c:\Users\devan\Downloads\turf-match-app-build

# Build
npm run build

# Export static files
npm run export
```

This creates an `out/` folder with your app.

### Step 2: Zip the bundle
```powershell
# Navigate to output folder
cd out

# Create zip (Windows)
Compress-Archive -Path * -DestinationPath ..\app-bundle.zip

# Or if you have 7zip
# 7z a ..\app-bundle.zip .

cd ..
```

### Step 3: Compute checksum
```powershell
# Windows PowerShell
$hash = Get-FileHash app-bundle.zip -Algorithm SHA256
Write-Output $hash.Hash
```

### Step 4: Upload to Supabase Storage

1. Open Supabase Dashboard → Storage → `app-bundles` bucket
2. Click "Upload" → select your `app-bundle.zip`
3. Click the file → "Get URL" → copy the public URL

It will look like:
```
https://ziwzynzwrjcwrllmlwsy.supabase.co/storage/v1/object/public/app-bundles/app-bundle.zip
```

### Step 5: Insert version into database

Open Supabase Dashboard → Table Editor → `app_versions` → Insert row:

| Column | Value | Example |
|--------|-------|---------|
| version | Semantic version | `1.0.1` |
| build_number | Build number | `101` |
| min_native_version | Min native app | `1.0.0` |
| platform | Target platform | `all` |
| channel | Release channel | `stable` |
| status | Version status | `active` |
| bundle_url | Storage URL | `https://...supabase.co/.../app-bundle.zip` |
| bundle_checksum | SHA256 hash | `sha256:abc123...` |
| bundle_size_mb | Size in MB | `2.5` |
| is_mandatory | Force update? | `false` |
| rollout_pct | Rollout % | `100` |
| release_notes | What's new | `Bug fixes and UI improvements` |
| published_at | Publish time | `now()` |

### Step 6: Test on mobile

1. Kill and reopen your TurfMatch app
2. It will check `https://turf-match-admin.vercel.app/api/version.json`
3. If version is newer, you'll see the update banner
4. Tap Update → downloads → auto-reloads

---

## Quick Reference: One-liner deploy script

Save this as `deploy-ota.ps1` in your project root:

```powershell
# deploy-ota.ps1
$VERSION = Read-Host "Enter version (e.g. 1.0.1)"
$CHANNEL = Read-Host "Enter channel (dev/beta/stable)"
$ROLLOUT = Read-Host "Rollout % (0-100)"

Write-Host "Building..."
npm run build
npm run export

Write-Host "Zipping..."
cd out
Compress-Archive -Path * -DestinationPath ..\bundle.zip
cd ..

$HASH = (Get-FileHash bundle.zip -Algorithm SHA256).Hash
$SIZE = [math]::Round((Get-Item bundle.zip).Length / 1MB, 2)

Write-Host "Upload to Supabase Storage manually:"
Write-Host "  Bucket: app-bundles"
Write-Host "  File: bundle.zip"
Write-Host ""
Write-Host "Then run this SQL in Supabase:"
Write-Host @"
INSERT INTO app_versions (version, build_number, platform, channel, status, bundle_url, bundle_checksum, bundle_size_mb, is_mandatory, rollout_pct, release_notes, published_at)
VALUES ('$VERSION', 1, 'all', '$CHANNEL', 'active', 'https://ziwzynzwrjcwrllmlmlwsy.supabase.co/storage/v1/object/public/app-bundles/bundle.zip', 'sha256:$HASH', $SIZE, false, $ROLLOUT, 'Manual deploy', now());
"@
```

Run it:
```powershell
.\deploy-ota.ps1
```

---

## Troubleshooting

### "Cannot find module" error
```powershell
rm -r node_modules
rm package-lock.json
npm cache clean --force
npm install
```

### "app-bundles bucket not found"
Create it in Supabase Dashboard → Storage. Must be public.

### Mobile app not detecting update
1. Check your `currentVersion` in mobile app matches what's in `device_update_state`
2. Verify `/api/version.json` returns `updateAvailable: true`
3. Test URL directly: `https://turf-match-admin.vercel.app/api/version.json?deviceId=test&platform=android&currentVersion=1.0.0&nativeVersion=1.0.0&channel=stable`

### Rollout not working
The rollout uses a deterministic hash of `deviceId`. Same device always gets same result. Test with different `deviceId` values.
