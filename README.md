<div align="center">

<img src="public/logo-turf-match.png" alt="TurfMatch" width="140" />

# TurfMatch

### India's First Real-Time Sports Matchmaking Platform

**Find Players · Book Turfs · Play Instantly**

[![Live App](https://img.shields.io/badge/🌐_Live_App-turfmatch.app-4edea3?style=for-the-badge)](https://www.turfmatch.app)
[![Download APK](https://img.shields.io/badge/📲_Download-Android_APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://www.turfmatch.app)

---

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=flat-square&logo=capacitor&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

![Lines of Code](https://img.shields.io/badge/Lines_of_Code-22%2C143-blueviolet?style=flat-square)
![Screens](https://img.shields.io/badge/Screens-30-orange?style=flat-square)
![TypeScript Files](https://img.shields.io/badge/TS_Files-152-3178C6?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Android_%2F_Web-3DDC84?style=flat-square)

</div>

---

## Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [How Turf Search Works](#-how-turf-search-works)
- [Features](#-features)
- [Admin Dashboard & OTA System](#-admin-dashboard--ota-system)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#️-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [Security & Privacy](#-security--privacy)
- [Engineering Highlights](#-engineering-highlights)
- [Design System](#-design-system)
- [Business Model](#-business-model)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [FAQ](#-faq)

---

## 🎯 The Problem

> **70%+ of recreational cricket matches in India get cancelled** — not because people don't want to play, but because the logistics are broken.

India has **30 million+ recreational cricketers** spread across **50,000+ box cricket turfs**, yet there's no organized marketplace connecting them. The current reality:

| Step | What People Do Today | Frustration |
|------|----------------------|-------------|
| Finding players | Spam WhatsApp groups, beg friends | 😤 High |
| Booking a turf | Call 10 venues, no online availability | 😤 High |
| Gauging skill | Pure guesswork, no profile system | 😡 Very High |
| Collecting payment | Cash at venue, chasing people | 🤬 Extreme |
| Live scoring | Paper scorecards, data gets lost | 😤 High |
| Getting there | Separate Google Maps search | 😑 Medium |

**TurfMatch solves all six in a single app.**

---

## 💡 The Solution

**TurfMatch** is the **Tinder + BookMyShow for recreational cricket** — a production-ready Android app (and PWA) that takes you from "I want to play" to "on the ground" in under 2 minutes.

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│   🏟️  DISCOVER     →    🤝  MATCH      →   📍  NAVIGATE   →  🏏 PLAY  │
│                                                                      │
│   Real turfs            Skill-based        Turn-by-turn    Ball-by-  │
│   near you now          smart join         Google Routes   ball live │
│   Live slots            Squad chat         ETA tracking    scorecard │
│   Price compare         Reliability        Polyline map    Stats     │
│                         scores                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 How Turf Search Works

One of the most interesting pieces of the system — here's what happens in the ~2 seconds between you opening the app and seeing nearby turfs:

```
Step 1 ──▶  Native GPS (Capacitor)
               └─ fails? ──▶  Browser Geolocation API
                                 └─ fails? ──▶  Default to Pune + manual search

Step 2 ──▶  Fire 4 parallel Google Places queries:
               • "sports turf ground"
               • "cricket ground turf"
               • "box cricket turf"
               • "football turf futsal court"
               (all within 15 km radius)

Step 3 ──▶  Deduplicate + score every result:
               Score = (name keyword matches × 25)
                     + (address keyword matches × 5)
                     + (sports Google type bonus × 15)

               Hard-REJECT:  40+ blocked types
                             (banks, restaurants, hospitals, temples…)
               Hard-REQUIRE: ≥1 turf keyword  OR  ≥1 sports type

Step 4 ──▶  Enrich with cricket metadata:
               Deterministic hash(placeId) → price/hr, slots,
               pitch type, amenities  (same place = same data, always)

Step 5 ──▶  Render: photos, rating, distance, price, slots,
               one-tap call, one-tap navigation
```

---

## ✨ Features

### 🏟️ Smart Turf Discovery
- **Live Google Places API** — real turfs within 15 km, refreshed every open
- **4-query parallel search** with custom relevance scoring and 40+ blocked types
- **Haversine distance sort** — closest first, always
- Filter by price range, distance, pitch type, rating, amenities
- **Deterministic data hydration** — cricket metadata seeded consistently per venue

### 🗺️ Turn-by-Turn Navigation
- **Google Routes API v2** with live traffic awareness
- Rendered route polyline with smooth overlay
- Step-by-step maneuver instructions with icons
- **OSRM open-source fallback** — zero navigation downtime
- **Dual-mode maps**: Leaflet (offline/cost-saving) + Google Maps (full quality)

### 🤝 Intelligent Matchmaking
- Public, private, or invite-only match creation
- **Skill filtering**: Beginner / Intermediate / Pro
- **Reliability scores** (0–100%) based on historical join-rate
- **Gamified badges**: Rising Star → Club Pro → Elite
- Live slot counter: `11/14 filled` — updates across all devices < 500ms
- Smart invites filtered by role, skill, and zone

### 📡 Real-Time Everything
- Supabase Realtime (WebSocket) channels — zero polling
- Live slot updates, join requests, notifications, invites, badge counts
- Unique channel IDs prevent Supabase collision across concurrent sessions

### 🔔 Enterprise Push Notifications
- **FCM** — foreground, background, and killed-state delivery
- 5 Android notification channels with priority, sound, and vibration per category
- TTL-based **event deduplication** engine
- **Debounce coalescence** — 10 rapid joins → 1 smart notification
- **Deep-link routing** — tap navigates directly to the relevant screen
- Accept / Decline action buttons from the notification shade
- Delivered / displayed / tapped engagement analytics

### 🏏 Live Scoring Engine
- Ball-by-ball input for organizers
- Batter stats: runs, balls, SR, 4s, 6s; bowler stats: overs, runs, wkts, econ
- Real-time projected score, run rate, required rate
- Visual recent-balls strip (4s green, 6s blue, Ws red)

### 🏆 Tournaments
- Full lifecycle: registration → seeding → brackets → fixtures → results
- Interactive bracket (QF → SF → Final) with live score overlays
- Prize pool, entry fee, and team count management

### 👤 Privacy-First Profiles
- Career stats, win rate, zone, badge tier
- Phone numbers behind a **Privacy Gate** — visible only to confirmed squad during match window
- Supabase RLS enforces this at the database level

### 💬 Squad Chat
- Per-match chat rooms, auto-created on match creation
- System event messages (booking confirmed, player joined, navigation started)
- Unread badge counters with realtime sync

### 🛡️ Bulletproof Bootstrap
5-stage deterministic startup — zero race conditions:
```
NETWORK_READY → AUTH_HYDRATED → QUERY_READY → LOCATION_RESOLVED → APP_READY
```
Each stage gates the next. A query cannot fire before auth. Loading never hangs > 8s.

### 🌐 Offline Resilience
- Online/offline banner with visual indicator
- In-memory caches survive tab switches and app restores
- Background silent refresh on foreground
- 3-attempt retry with exponential backoff
- 10-second hard timeout on every Supabase query

---

## 🖥️ Admin Dashboard & OTA System

TurfMatch includes a **separate admin web panel** (not included in this repo) with a full **APK distribution & OTA update system**:

### How OTA Updates Work

```
Admin uploads signed APK via dashboard
      │
      ├─ Phase 1: HASH
      │    Client-side SHA-256 via Web Crypto API
      │
      ├─ Phase 2: SIGN
      │    POST /api/admin/apk/sign-upload
      │    ├─ Validates semver, versionCode, fileSize, sha256
      │    ├─ Creates Supabase Storage signed upload URL
      │    └─ Inserts DRAFT row in `app_versions` table
      │
      ├─ Phase 3: UPLOAD
      │    XHR PUT directly to Supabase Storage (bypasses Vercel 4.5 MB limit)
      │    └─ Real-time progress: bytes uploaded, %, KB/s speed, ETA countdown
      │
      └─ Phase 4: FINALIZE
           POST /api/admin/apk/finalize
           ├─ Verifies APK exists in storage bucket
           ├─ Archives previous active version on same channel
           └─ Sets status → "active", published_at = now()
```

### Version Check Flow (called by the app on every launch)

```
GET /api/version.json?deviceId=xxx&versionCode=2&channel=stable&sdk=31

Server logic:
  ├─ Is target versionCode > device's current?  → yes: update available
  ├─ Is device SDK ≥ min_android_sdk?            → no:  update blocked
  ├─ Is rollout_pct < 100?                       → hash(deviceId) % 100 to decide
  ├─ Is update mandatory?                        → bypasses staged rollout
  └─ Upserts device_update_state for dashboard "active devices" counter
```

### Admin Dashboard Features

| Feature | Details |
|---------|---------|
| **Upload signed APK** | Drag-and-drop with SHA-256 verification |
| **Version management** | Activate / Archive / Rollback / Delete per version |
| **Staged rollouts** | 0–100% slider, device hash bucketing |
| **Mandatory toggle** | Force-update blocks app until installed |
| **Channel targeting** | dev / beta / stable release channels |
| **Install analytics** | Success / failed / in-progress counts per version |
| **Device tracking** | Active devices (7d), devices by version bar chart |
| **Failure alerting** | ⚠️ warning badge when failure rate > 5% |
| **Realtime refresh** | Dashboard auto-refreshes via Supabase subscription |

### Auto-Rollback (Client-Side)

The mobile app's OTA engine (`lib/ota/rollback-manager.ts`) tracks consecutive failures:
- 3 failed installs in a row → **automatic rollback** to last stable bundle
- Device state machine: `idle → downloading → rebooting → idle` (or `→ failed`)
- All bundles verified by SHA-256 checksum before hot-swap

---

## 🏗️ Architecture

```
╔══════════════════════════════════════════════════════════════════════╗
║                        PRESENTATION LAYER                           ║
║                                                                     ║
║  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐  ║
║  │  30 Screen  │  │  14 Shared   │  │  Design    │  │  Framer  │  ║
║  │  Components │  │  Components  │  │  System    │  │  Motion  │  ║
║  └──────┬──────┘  └──────┬───────┘  │  Tailwind  │  │  Anims   │  ║
║         └────────┬────────┘         │  + Radix   │  └──────────┘  ║
║                  ▼                  └────────────┘                 ║
║  ┌──────────────────────────────────────────────────────────────┐  ║
║  │          In-Memory Stack Navigator (Custom Router)           │  ║
║  │     pushScreen · popScreen · replaceScreen · goHome          │  ║
║  └────────────────────────────┬─────────────────────────────────┘  ║
╠════════════════════════════════╪═════════════════════════════════════╣
║                                ▼                                    ║
║                          DATA LAYER                                 ║
║                                                                     ║
║  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐  ║
║  │use-supabase │  │use-realtime  │  │   supabase-data.ts       │  ║
║  │(React Hooks)│  │(WS Channels) │  │   Repository Pattern     │  ║
║  └──────┬──────┘  └──────┬───────┘  │   1,342 lines of CRUD   │  ║
║         └────────┬────────┘         └────────────┬─────────────┘  ║
║                  ▼                               ▼                 ║
║  ┌──────────────────────────────────────────────────────────────┐  ║
║  │                    BOOTSTRAP SYSTEM                          │  ║
║  │  NetworkMonitor → SessionManager → GuardedFetch → AppReady  │  ║
║  └────────────────────────────┬─────────────────────────────────┘  ║
╠════════════════════════════════╪═════════════════════════════════════╣
║                                ▼                                    ║
║                        INFRASTRUCTURE                               ║
║                                                                     ║
║  ┌──────────┐  ┌──────────┐  ┌───────────────┐  ┌─────────────┐  ║
║  │ Supabase │  │ Firebase │  │ Google Maps   │  │ OTA Engine  │  ║
║  │ Postgres │  │   FCM    │  │ Places API    │  │ (Capgo +    │  ║
║  │ Auth     │  │  Push    │  │ Routes API v2 │  │  ApkUpdater)│  ║
║  │ Storage  │  │  Notifs  │  │ Nominatim     │  │             │  ║
║  │ Realtime │  │          │  │ OSRM fallback │  │             │  ║
║  └──────────┘  └──────────┘  └───────────────┘  └─────────────┘  ║
║                                                                     ║
║  ┌──────────────────────────────────────────────────────────────┐  ║
║  │                  CAPACITOR NATIVE BRIDGE                     │  ║
║  │  Geolocation · Push · LocalNotifs · AppLifecycle · Storage   │  ║
║  │  ApkUpdater (Custom Plugin) · GoogleAuth · InAppBrowser      │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Rendering** | Next.js Static Export | Zero server cost — pure HTML/JS/CSS inside Capacitor shell |
| **Navigation** | Custom in-memory stack | Future-compatible with React Navigation; no URL routing needed |
| **Data layer** | Repository pattern + guard wrappers | Prevents unauthenticated / offline queries at the call site |
| **State** | React Context + module-level caches | No Redux overhead for a focused mobile app |
| **Realtime** | Supabase Postgres Changes | < 500ms updates; eliminates all polling |
| **Updates** | Capgo OTA + Custom APK Updater | JS hotfixes in minutes; native changes via silent APK self-update |
| **Maps** | Google Places (New) + Routes v2 + Leaflet | Best discovery quality with open-source cost-saving fallback |

---

## 🛠️ Tech Stack

<table>
<tr>
<td valign="top" width="50%">

### Frontend

| Library | Version | Role |
|---------|---------|------|
| **Next.js** | 16 | Framework — static export mode |
| **React** | 19 | UI runtime |
| **TypeScript** | 5.7 | Full type safety |
| **Tailwind CSS** | 4 | Utility-first styling |
| **Radix UI** | latest | 20+ accessible primitives |
| **Framer Motion** | latest | Physics-based animations |
| **Lucide React** | latest | 560+ icon system |
| **Recharts** | latest | Data visualization |
| **Leaflet** | latest | Open-source map rendering |
| **React Hook Form** | latest | Performant forms |
| **Zod** | latest | Runtime schema validation |

</td>
<td valign="top" width="50%">

### Backend & Infrastructure

| Service | Role |
|---------|------|
| **Supabase** | Postgres, Auth, Storage, Realtime |
| **Firebase FCM** | Push notifications |
| **Google Places API (New)** | Turf discovery |
| **Google Routes API v2** | Navigation & directions |
| **Nominatim** | Reverse geocoding |
| **OSRM** | Fallback open-source routing |
| **Capacitor 8** | Native Android bridge |
| **Capgo** | OTA bundle delivery |
| **GitHub Actions** | CI/CD pipeline |
| **Vercel** | Web hosting & edge analytics |

</td>
</tr>
</table>

---

## 🗂️ Project Structure

```
turfmatch/
│
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout — fonts, viewport, metadata
│   ├── page.tsx                      # Entry point → mounts AppShell
│   └── globals.css                   # Design tokens + keyframe animations
│
├── components/
│   ├── screens/                      # 30 full-page screen components
│   │   ├── home-screen.tsx
│   │   ├── grounds-hub-screen.tsx    # Turf discovery + scoring engine
│   │   ├── match-detail-screen.tsx
│   │   ├── create-match-screen.tsx
│   │   ├── live-scorecard-screen.tsx
│   │   ├── turf-map-screen.tsx
│   │   ├── live-navigation-screen.tsx
│   │   └── … 23 more
│   │
│   ├── turfmatch/                    # Shared UI components
│   │   ├── app-shell.tsx             # Root shell + screen router
│   │   ├── tm-bottom-nav.tsx         # 5-tab navigation bar
│   │   ├── tm-bottom-sheet.tsx       # Draggable bottom sheet
│   │   ├── match-card.tsx
│   │   ├── filter-sheet.tsx
│   │   └── phone-gate.tsx            # Privacy-gated number reveal
│   │
│   └── ui/                           # shadcn/ui (Radix primitives)
│
├── lib/
│   ├── bootstrap/                    # 🛡️ 5-stage startup orchestration
│   │   ├── app-bootstrap.tsx         # Deterministic boot sequencer
│   │   ├── session-manager.ts        # Auth hydration + localStorage persist
│   │   ├── network-monitor.ts        # Online/offline state + event bus
│   │   ├── guarded-fetch.ts          # Auth-gated API call wrapper
│   │   └── startup-logger.ts         # Full boot timeline diagnostics
│   │
│   ├── turfmatch/                    # 🏏 Core business logic
│   │   ├── supabase-data.ts          # Repository layer  (1,342 lines)
│   │   ├── use-supabase.ts           # React hooks bridge (794 lines)
│   │   ├── use-realtime.ts           # Supabase WS subscriptions
│   │   ├── google-maps.ts            # Places + Routes API client
│   │   ├── location-store.tsx        # Geolocation context provider
│   │   ├── navigation.tsx            # In-memory stack router
│   │   ├── types.ts                  # 28 domain TypeScript interfaces
│   │   └── data.ts                   # Seed / mock data
│   │
│   ├── notifications/                # 🔔 Push notification engine
│   │   ├── notification-service.ts   # Orchestrator          (366 lines)
│   │   ├── deduplication.ts          # TTL-based event dedup
│   │   ├── deep-link.ts              # Notification URL → screen
│   │   ├── engagement.ts             # Delivery analytics
│   │   ├── permission.ts             # Permission flow management
│   │   └── push-token.ts             # FCM token registration + sync
│   │
│   ├── ota/                          # 📦 Over-the-air update system
│   │   ├── update-manager.ts         # Version check + download orchestrator
│   │   ├── apk-updater.ts            # Native APK Capacitor plugin bridge
│   │   ├── rollback-manager.ts       # Safe revert on consecutive failure
│   │   ├── version-utils.ts          # Semver comparison helpers
│   │   ├── device-state.ts           # State machine (idle/downloading/failed)
│   │   └── analytics.ts              # Update event tracking
│   │
│   ├── auth-context.tsx              # Auth state + player profile management
│   └── supabase.ts                   # Supabase singleton client
│
├── supabase/
│   └── migrations/                   # Versioned database schema migrations
│
├── android/                          # Capacitor Android native project
├── .github/
│   └── workflows/
│       └── ota-deploy.yml            # Automated OTA CI/CD pipeline
└── public/                           # Static assets, icons, splash screens
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 20 |
| npm / pnpm | latest |
| Android Studio | latest stable (for native builds) |
| Supabase project | free tier works |

### 1 — Clone & install

```bash
git clone https://github.com/Devanshupardeshi/turfmatch.git
cd turfmatch
npm install       # or: pnpm install
```

### 2 — Configure environment

Create `.env.local` in the project root (see [Environment Variables](#-environment-variables)):

```bash
cp .env.example .env.local
# then fill in your keys
```

### 3 — Run the dev server

```bash
npm run dev
# http://localhost:3000
```

### 4 — Build & run on Android

```bash
npm run build           # Next.js static export → /out
npx cap sync android    # Copy web assets into the Android project
npx cap open android    # Open Android Studio
# Then: Run → select device / emulator
```

### 5 — Deploy an OTA update

```bash
git push origin main
# GitHub Actions automatically:
#   1. npm run build
#   2. zip the bundle
#   3. SHA-256 checksum
#   4. Upload to Supabase Storage
#   5. Insert version record
#   ✓  Devices hot-swap the code on next launch
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon (public) key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | ✅ | Google Maps + Places + Routes |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID (for Sign-In) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ CI only | Used in GitHub Actions & Admin — never expose client-side |

---

## 🗄️ Database Schema

```sql
-- Core tables (Supabase / Postgres)

players              -- profile, stats, zone, badge, reliability_score, push_token
matches              -- sport, location, datetime, skill_level, slots, status
match_players        -- join table: player ↔ match, role, join_status
notifications        -- type, payload, read, delivered, deep_link_url
chat_messages        -- match_id, sender_id, content, message_type
app_versions         -- version, channel, bundle_url, checksum, rollout_pct, status
apk_install_attempts -- version_id, device_id, outcome (installed/failed/downloading)
device_update_state  -- device_id, current_version, last_check_at, update_status
```

All tables are protected by **Row-Level Security (RLS)** policies.
Migrations live in `supabase/migrations/`.

---

## 🔐 Security & Privacy

| Feature | How it works |
|---------|-------------|
| **Row-Level Security** | Supabase RLS on every table — users read/write only their own rows |
| **Phone Privacy Gate** | Numbers visible only to confirmed squad during the active match window |
| **Auth Guard** | `guardedFetch()` wrapper — zero API calls until auth state is confirmed |
| **JWT Rotation** | Handled automatically by Supabase |
| **API Key Scoping** | `anon` key client-side (read-only RLS); `service_role` key only in CI/Admin |
| **OTA Integrity** | SHA-256 checksum verified before every bundle install |
| **APK Signing Verification** | Optional signing fingerprint pinning to prevent tampered APKs |
| **Form Validation** | Zod schemas on all inputs — client and server side |
| **Install Permissions** | `REQUEST_INSTALL_PACKAGES` flow surfaced with clear UI for APK updates |

---

## 🧪 Engineering Highlights

### 1 · Race-Condition-Free Bootstrap

The single biggest issue with Capacitor apps is startup race conditions — auth not ready, DB calls firing blind. TurfMatch solves this with a strict 5-stage sequence:

```typescript
// lib/bootstrap/app-bootstrap.tsx
enum BootStage {
  IDLE              = 0,
  NETWORK_READY     = 1,  // navigator.onLine + connection listener attached
  AUTH_HYDRATED     = 2,  // Supabase session restored from localStorage
  QUERY_READY       = 3,  // guardedFetch unlocked
  LOCATION_RESOLVED = 4,  // Capacitor GPS or browser fallback complete
  APP_READY         = 5,  // UI unlocks — render home screen
}

// Stage N cannot start until Stage N-1 resolves.
// Hard timeout: no stage may block > 8 seconds (force-resolves with safe fallback).
```

### 2 · Realtime Without Any Polling

```typescript
// lib/turfmatch/use-realtime.ts
// All five realtime channels — sub-500ms latency across devices

useRealtimeMatches(onEvent)         // matches table changes
useRealtimeMatchPlayers(matchId)    // slot fills / departures
useRealtimeNotifications(userId)    // instant alert delivery
useRealtimeMyInvites(userId)        // invite accept / decline
useRealtimeBadgeCount(userId)       // notification badge counter
```

Each channel gets a **UUID-scoped name** to prevent collision when multiple instances run.

### 3 · ML-Free Turf Relevance Engine

```typescript
// lib/turfmatch/google-maps.ts

function scoreTurfResult(place: GooglePlace): number {
  let score = 0;

  // Name keyword matches: "turf", "cricket", "ground", "box", "court", "futsal"
  for (const keyword of TURF_KEYWORDS) {
    if (place.displayName.text.toLowerCase().includes(keyword)) score += 25;
  }
  // Address keyword matches
  for (const keyword of ADDRESS_KEYWORDS) {
    if (place.formattedAddress?.toLowerCase().includes(keyword)) score += 5;
  }
  // Google places type bonus: "sports_complex", "stadium", "sports_activity_location"
  for (const type of place.types ?? []) {
    if (SPORTS_TYPES.has(type)) score += 15;
  }
  // Hard-reject if zero signal
  return score;
}

// 40+ blocked types: restaurant, bank, hospital, temple, car_dealer, lodging …
```

### 4 · Graceful Degradation Stack

```
Google Routes API v2   ──fails?──▶  OSRM (open-source routing)
Capacitor GPS          ──fails?──▶  Browser Geolocation API
                                         └──fails?──▶  Default to Pune
Supabase query         ──timeout 10s──▶  Return cached + schedule retry
Loading state          ──stuck > 8s──▶  Force-resolve (never infinite spinner)
OTA download           ──3 failures──▶  Auto-rollback to last stable bundle
```

### 5 · Full OTA Pipeline (Admin → Device)

```
Admin Dashboard: Upload signed APK
      │
      ├─▶  Client-side SHA-256 hash
      ├─▶  POST /api/admin/apk/sign-upload → creates draft + signed URL
      ├─▶  XHR PUT direct to Supabase Storage (progress bar, KB/s, ETA)
      ├─▶  POST /api/admin/apk/finalize → activates, archives prior version
      │
Device on next launch:
      ├─▶  GET /api/version.json?versionCode=X&channel=stable&deviceId=Y
      ├─▶  Server: versionCode comparison + SDK check + staged rollout hash
      ├─▶  Download APK → verify SHA-256 → trigger Android install
      └─▶  3 consecutive failures → auto-rollback to last stable
```

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| **Primary** | `#4edea3` — Mint green |
| **Secondary** | `#ffb95f` — Warm amber |
| **Background** | `#0c1324` — Deep navy |
| **Surface levels** | 7-tier elevation ladder: `lowest` → `low` → `surface` → `container` → `high` → `highest` → `bright` |
| **Body font** | Lexend (variable) |
| **Display font** | Anton (headings) |
| **Border radius** | `0.75rem` base |
| **Motion** | `fade-in`, `slide-up`, `pulse-glow`, `screen-enter` keyframes |
| **Press feedback** | `scale(0.97)` + `opacity(0.85)` on tap |
| **Theme** | Dark-first — entire UI designed for dark backgrounds |
| **Accessibility** | `prefers-reduced-motion` respected; semantic HTML throughout |
| **Performance** | `content-visibility: auto`; GPU-accelerated transforms; lazy image loading |

---

## 📊 By the Numbers

<div align="center">

| Metric | Value |
|--------|-------|
| TypeScript source files | **152** |
| Lines of application code | **22,143** |
| App screens | **30** |
| Reusable UI components | **14 custom + 30 Radix** |
| Supabase tables | **8** |
| Realtime channels | **5** |
| External API integrations | **4** |
| Android notification channels | **5** |
| OTA system modules | **11** |
| Bootstrap stages | **5** |
| Domain TypeScript interfaces | **28** |

</div>

---

## 📈 Business Model

### Market Size

| Tier | Value | Scope |
|------|-------|-------|
| **TAM** | ₹15,000 Cr (~$1.8B) | Indian recreational sports |
| **SAM** | ₹3,000 Cr (~$360M) | Urban box cricket + turf bookings |
| **SOM (Year 1)** | ₹50 Cr (~$6M) | Pune + Mumbai metro launch |

**30M+** recreational cricketers · **50,000+** turfs · growing **25% YoY**

### Revenue Streams

| Stream | Mechanism |
|--------|-----------|
| 🎫 **Match Fees** | 5–10% platform commission per player transaction |
| 🏟️ **Turf Partnerships** | Featured listings, premium placement, booking commissions |
| 🏆 **Tournament Hosting** | Entry fee share + sponsored tournaments with prize pools |
| ⭐ **Player Premium** | Priority matching, advanced stats, badge boosts |
| 📊 **Data Insights** | Anonymized sports analytics for brands & equipment makers |

### Competitive Landscape

| Competitor | Their Scope | TurfMatch Advantage |
|-----------|-------------|---------------------|
| **Playo** | Manual match listings | Real-time matchmaking + live scoring + navigation |
| **Hudle** | Venue booking only | Full loop: discover → match → navigate → play → score |
| **SportVot** | Live streaming | Grassroots focus — getting people on the ground |
| **WhatsApp Groups** | Unstructured chaos | Reliability scores, skill filters, structured workflows |

---

## 🗺️ Roadmap

| Version | ETA | Theme | Highlights |
|---------|-----|-------|-----------|
| ✅ v1.0 | **Shipped** | MVP | Matchmaking, turf discovery, navigation, notifications, OTA |
| 🔄 v1.1 | Q3 2026 | Social | Friend system, team creation, leaderboards |
| 📅 v1.2 | Q3 2026 | Payments | UPI integration, in-app split billing |
| 🤖 v2.0 | Q4 2026 | AI | ML player recommendations, smart venue/time suggestions |
| 🍎 v2.1 | Q1 2027 | iOS | `npx cap add ios` — same codebase, new platform |
| ⚽ v3.0 | Q2 2027 | Multi-sport | Football, badminton, basketball, tennis |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# 1. Fork the repo and clone your fork
git clone https://github.com/<your-username>/turfmatch.git

# 2. Create a feature branch
git checkout -b feat/your-feature-name

# 3. Make your changes, then commit
git commit -m "feat: describe what you did"

# 4. Push and open a Pull Request
git push origin feat/your-feature-name
```

**Before submitting:**
- Run `npm run build` — the static export must succeed
- Keep TypeScript strict — no `any` without a comment explaining why
- Match the existing code style (Prettier + ESLint config included)
- Update this README if you add a new screen, feature, or env variable

For larger changes, open an issue first to discuss the approach.

---

## ❓ FAQ

<details>
<summary><strong>Is this actually live, or is it a hackathon prototype?</strong></summary>

It's live. Download the APK from [turfmatch.app](https://www.turfmatch.app) on any Android phone right now. OTA updates are running, push notifications work, Google Maps turf discovery is real. This is not a Figma mockup.

</details>

<details>
<summary><strong>How does turf discovery work — is it a static database?</strong></summary>

No static database. We call the Google Places API (New) in real time, fire 4 parallel searches, run every result through our custom relevance scoring engine, reject the noise (restaurants, banks, etc.), and return actual turfs sorted by your live GPS distance. Fresh results every time you open the app.

</details>

<details>
<summary><strong>What happens when I'm offline or on a flaky connection?</strong></summary>

The app does not crash or freeze. Cached data persists across tab switches and restarts. Every API call has a 10-second hard timeout. Failures retry 3 times with exponential backoff. Any loading state that hasn't resolved in 8 seconds force-resolves with a fallback. If you're fully offline, you see a clean banner with a retry button.

</details>

<details>
<summary><strong>Do you run your own backend server?</strong></summary>

No. Zero server cost. The app is a Next.js static export (HTML/JS/CSS) inside a Capacitor Android shell. All backend — database, auth, storage, realtime WebSockets — is Supabase. Push notifications go through Firebase Cloud Messaging. We can serve thousands of users on Supabase's free tier before incurring any infrastructure cost.

</details>

<details>
<summary><strong>How do OTA updates work exactly?</strong></summary>

An admin uploads a signed APK via our admin dashboard. The system computes SHA-256, uploads directly to Supabase Storage via signed URL, and inserts a version record with channel, rollout %, and mandatory flag. When a user opens the app, it calls `/api/version.json` — the server checks versionCode, SDK compatibility, and staged rollout eligibility. If eligible, the app downloads, verifies the checksum, and installs. If 3 consecutive devices report failures, it auto-rolls back.

</details>

<details>
<summary><strong>Why Capacitor instead of React Native or Flutter?</strong></summary>

We wanted to ship fast using a TypeScript/React stack we already knew deeply, while still having full access to native APIs (GPS, push, filesystem). Capacitor gives us that, plus a single codebase that compiles to Android today and iOS tomorrow with one command (`npx cap add ios`).

</details>

<details>
<summary><strong>How is player phone number privacy handled?</strong></summary>

Phone numbers are never shown publicly. Our "Phone Gate" component reveals a number only to confirmed squad members of the same match, only during the active match window. This is enforced both at the UI layer and at the Supabase database layer via Row-Level Security policies.

</details>

<details>
<summary><strong>Can I use this for football, badminton, or other sports?</strong></summary>

Not yet, but it's architected for it. Turf search already discovers football turfs and futsal courts. The `Match` type includes a `sportType` field. Multi-sport support is the v3.0 milestone (Q2 2027).

</details>

<details>
<summary><strong>What's the tech stack in one sentence?</strong></summary>

Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Supabase (Postgres + Auth + Realtime + Storage) + Capacitor 8 (Android) + Firebase FCM + Google Places/Routes APIs + GitHub Actions CI/CD.

</details>

---

<div align="center">

---

### 🏏 Stop searching WhatsApp groups. Start playing.

[![Download TurfMatch](https://img.shields.io/badge/📲_Download_TurfMatch-4edea3?style=for-the-badge&logoColor=white)](https://www.turfmatch.app)
[![Visit Website](https://img.shields.io/badge/🌐_turfmatch.app-0c1324?style=for-the-badge)](https://www.turfmatch.app)

---

Built with ❤️ in Pune, India 🇮🇳

**Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Supabase · Capacitor 8 · Firebase FCM · Google Maps**

© 2026 TurfMatch · All rights reserved

</div>
