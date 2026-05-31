# TurfMatch OTA Update Architecture — Production Guide

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Mobile App  │────▶│  /api/ver    │────▶│  Supabase    │
│              │     │  Admin API   │     │  app_versions│
└──────────────┘     └──────────────┘     └──────────────┘
       │                                      │
       ▼                                      ▼
┌──────────────┐                    ┌──────────────┐
│ Capacitor    │                    │ update_events│
│ app-updater  │                    │ device_state │
└──────────────┘                    └──────────────┘
```

## Database Schema

### app_versions
| Column | Type | Description |
|--------|------|-------------|
| version | text | Semantic version (1.2.3) |
| build_number | int | CI build number |
| min_native_version | text | Minimum native app version required |
| platform | enum | android, ios, all |
| channel | enum | dev, beta, stable |
| status | enum | draft, staging, active, archived, rollback |
| bundle_url | text | Supabase Storage signed URL |
| bundle_checksum | text | SHA256 hash for integrity |
| bundle_size_mb | numeric | Bundle size for progress |
| is_mandatory | bool | Force update before app use |
| rollout_pct | int | 0-100 staged rollout |

### update_events
Analytics table: check, download_start, download_complete, install_success, install_failed, rollback_triggered.

### device_update_state
Per-device tracking: current_version, pending_version, boot_count, consecutive_failures.

## Version Check Flow

```
App Launch
  │
  ├──▶ Boot Health Check (verifyBootHealth)
  │     ├── boot_count > 3? → ROLLBACK to last_known_good
  │     └── OK → Continue
  │
  ├──▶ Check /api/version.json
  │     ├── Semantic version compare
  │     ├── Native version compatibility
  │     ├── Staged rollout bucket check
  │     └── Blocked version check
  │
  └──▶ If update available
        ├── Mandatory? → Force modal
        ├── Optional? → Banner with "Later"
        └── Download via app-updater
            ├── Success → Mark boot as rebooting
            └── Failure → Increment failure counter
```

## Rollback Safety

- **Boot counter**: After update, boot_count increments. If app crashes 3 times → auto-rollback.
- **Timeout**: If app doesn't report healthy boot within 30s of install → rollback.
- **Last known good**: Stored in device_update_state.last_successful_version.
- **Blocked versions**: Failed versions are blacklisted per device via localStorage.

## Staged Rollout

Device gets a deterministic bucket (0-99) from deviceId hash. Only devices with bucket < rollout_pct receive the update.

## Channels

| Channel | Purpose |
|---------|---------|
| dev | Internal testing, auto-deploy from CI |
| beta | Beta testers, 50% rollout |
| stable | Production, 100% rollout |

App sends `channel=stable` in version check. Only active versions in that channel are returned.

## Production Checklist

- [ ] Install `@capacitor-community/app-updater`
- [ ] Set `APP_NATIVE_VERSION` in `update-manager.ts`
- [ ] Configure `SUPABASE_SERVICE_ROLE_KEY` secret in CI
- [ ] Create `app-bundles` Storage bucket (public)
- [ ] Test rollback: publish bad version → verify auto-rollback
- [ ] Test staged rollout: set 10% → verify only some devices get it
- [ ] Test native incompatibility: set min_native_version higher → verify blocked
- [ ] Test mandatory update: set is_mandatory=true → verify "Later" hidden
- [ ] Monitor update_events table for failure rates
