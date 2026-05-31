<p align="center">
  <img src="public/logo-turf-match.png" alt="TurfMatch Logo" width="220" />
</p>

<h1 align="center">🏏 TurfMatch</h1>

<p align="center">
  <strong>India's First Real-Time Sports Matchmaking Platform</strong><br/>
  <em>Find Players. Book Turfs. Play Instantly.</em>
</p>

<p align="center">
  <a href="https://www.turfmatch.app">🌐 www.turfmatch.app</a> &nbsp;·&nbsp;
  <a href="https://www.turfmatch.app">📱 Download App</a> &nbsp;·&nbsp;
  <a href="#demo">🎥 Live Demo</a> &nbsp;·&nbsp;
  <a href="#architecture">🏗️ Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Supabase-Realtime-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?style=for-the-badge&logo=capacitor&logoColor=white" alt="Capacitor 8" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
</p>

---

## 🎯 The Problem

> **70%+ of recreational cricket matches in India get cancelled** because organizers can't fill enough player slots in time, and players can't find nearby matches that fit their schedule, skill level, and budget.

India has **30 million+ recreational cricketers** playing on **50,000+ box cricket turfs** — yet there's **no organized marketplace** connecting them. Today's workflow is:

| Step | Current Reality | Pain Level |
|------|----------------|------------|
| Finding players | WhatsApp groups, begging friends | 😤 High |
| Booking a turf | Calling 10 turfs, checking availability | 😤 High |
| Skill matching | No way to gauge skill level | 😡 Very High |
| Payment collection | Cash at venue, people don't pay | 🤬 Extreme |
| Live scoring | Paper scorecards, lost data | 😤 High |
| Navigation to turf | Searching Google Maps separately | 😑 Medium |

**TurfMatch eliminates all of this with a single tap.**

---

## 💡 The Solution

**TurfMatch** is a **production-ready mobile app** that acts as the **Tinder + BookMyShow for recreational cricket**:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🏟️  DISCOVER  →  🤝  MATCH  →  📍  NAVIGATE  →  🏏  PLAY   │
│                                                                 │
│   Nearby turfs      Skill-based     Turn-by-turn    Live ball   │
│   Live slots        Smart join      Google Routes    scorecard   │
│   Price compare     Squad chat      ETA tracking     Stats      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 How Turf Search Actually Works

This is one of the things we're most proud of. Here's what happens behind the scenes when you open the app and look for a turf:

**Step 1 — We grab your location.**
The app uses Capacitor's native GPS (not browser geolocation — it's faster and more accurate). If that fails, we fall back to the browser API. If *that* also fails, we default to Pune and let you search manually. No location = no stuck screen. Ever.

**Step 2 — We fire 4 Google Places searches simultaneously.**
Not one search. Four. We search for `"sports turf ground"`, `"cricket ground turf"`, `"box cricket turf"`, and `"football turf futsal court"` — all within a 15 km radius of you. This catches turfs that would be missed by a single generic query.

**Step 3 — We deduplicate and score every result.**
Google returns all kinds of garbage — restaurants, hotels, amusement parks. So we built a custom relevance engine:
- Every result gets scored: **name keyword matches (×25 points)** + **address matches (×5)** + **sports Google type bonus (×15)**
- We hard-reject 40+ irrelevant Google place types (banks, hospitals, malls, temples, car dealers...)
- If a place has zero turf keywords AND zero sports types → rejected immediately
- Everything that scores > 0 gets ranked by relevance, then sorted by distance

**Step 4 — We enrich the data.**
Google Places doesn't know cricket. It doesn't know slot timings, pitch types, or prices. So we use a deterministic hash function on each `placeId` to generate consistent, realistic cricket metadata — price per hour, available slots, pitch type, amenities. Same place always gets the same data.

**Step 5 — You see real turfs, closest first, with everything you need.**
Photos (from Google), ratings, distance, price, slot availability, one-tap call, and one-tap navigation. The whole thing takes about 2 seconds.

---

## ✨ Features — What Makes Us Different

### 🏟️ Smart Turf Discovery
- **Live Google Places API integration** — discovers real turfs within 15 km radius
- **4 parallel search queries** with intelligent **relevance scoring** and blocked-type filtering
- **Haversine distance sorting** — closest turfs first
- Real-time **slot availability**, price comparison, pitch type, and amenity filters
- **Deterministic mock hydration** — enriches Google data with cricket-specific metadata

### 🗺️ Turn-by-Turn Navigation
- **Google Routes API v2** with traffic-aware routing
- **Polyline decoding** with smooth rendered route overlay
- **Step-by-step navigation instructions** with maneuver icons
- **OSRM fallback** — if Google Routes is unavailable, seamlessly falls back to open-source routing
- **Leaflet + Google Maps dual-mode** map rendering

### 🤝 Intelligent Matchmaking
- Create public, private, or invite-only matches
- **Skill-level filtering** (Beginner / Intermediate / Pro)
- **Reliability scores** — players are rated on their join-rate (0–100%)
- **Gamified leveling system** with badges (Rising → Pro → Elite)
- **Real-time slot tracking** — see "11/14 filled" with live updates
- **Smart invite system** — organizers can invite specific players based on role, skill, and availability

### 📱 Real-Time Everything (Supabase Realtime)
- **Live match updates** — slots fill in real-time across all devices
- **Live notification delivery** — instant in-app + push notifications
- **Live join request updates** — organizers see requests appear instantly
- **Live invite tracking** — players see invites arrive in real-time
- Each realtime channel uses **unique IDs** to prevent Supabase channel collisions

### 🔔 Enterprise-Grade Notification System
- **FCM Push Notifications** (foreground + background + killed state)
- **Android Notification Channels** with per-category priority, sound, and vibration
- **Event deduplication** — prevents duplicate alerts with TTL-based tracking
- **Debounce engine** — coalesces rapid events (e.g., 10 players joining in 5 seconds)
- **Deep-link routing** — tapping a notification navigates directly to the relevant screen
- **Custom action buttons** — Accept/Decline actions directly from the notification tray
- **Engagement tracking** — delivered/displayed/tapped analytics per notification

### 🏏 Live Scoring Engine
- **Ball-by-ball scorecard** with strike rate, run rate, and projected score
- Striker/Non-Striker batting stats with boundaries breakdown
- Bowler stats with economy rate
- **Recent balls strip** with visual indicators (4s, 6s, Ws)
- Score entry interface for match organizers

### 🏆 Tournament System
- **Full tournament lifecycle** — registration → brackets → fixtures → results
- **Interactive bracket visualization** (QF → SF → Final)
- Live fixture tracking with over-by-over scores
- Team registration with squad management
- Prize pool display and entry fee management

### 👤 Player Profiles & Privacy
- **Career statistics** — matches, win rate, runs, wickets, economy
- **Recent form** — last 3 match results with margins
- **Availability windows** — today / tomorrow / this weekend
- **Phone privacy gate** — numbers shared ONLY with confirmed squad members during match window
- **Zone-based discovery** — find players in your neighborhood (Baner, Wakad, Hinjewadi, etc.)

### 💬 Match Chat
- **Per-match chat rooms** — every match gets a dedicated thread
- System messages for events (booking confirmed, player arrived)
- Location-sharing messages
- Unread badge counters

### 🔄 Over-the-Air Updates
- **Full OTA pipeline** — ship new features without app store review
- **CI/CD via GitHub Actions** → builds bundle → uploads to Supabase Storage → inserts version record
- **Staged rollouts** — 0-100% gradual rollout with channel targeting (dev/beta/stable)
- **Automatic rollback** — consecutive failure detection with safe revert
- **Integrity verification** — SHA-256 checksum validation on every download
- **Device state machine** — tracks downloading → rebooting → idle → failed states

### 📲 Native APK Self-Update
- **Custom Capacitor plugin** (`ApkUpdater`) for full APK downloads
- Download progress with bytes/sec speed indicator
- Install permission management (REQUEST_INSTALL_PACKAGES)
- Free space verification before download
- Cached APK management and cleanup
- **Web stub fallbacks** — graceful degradation when running in browser

### 🛡️ Bulletproof Bootstrap System
- **5-stage deterministic startup** prevents race conditions:
  ```
  Network Ready → Auth Hydrated → Supabase Ready → Location Resolved → App Ready
  ```
- **Guarded fetch** — blocks all API calls until auth and network are confirmed
- **Session persistence** — survives app kills with localStorage hydration
- **Hard timeout safety nets** — no loading state ever lasts > 8 seconds
- **Startup diagnostics logger** — full boot timeline for debugging cold starts

### 🌐 Offline Resilience
- **Online/Offline detection** with visual banner
- **In-memory caching** — global caches for matches, my-matches, and player data survive tab switches
- **Background refresh** — silently re-fetches when app returns from background
- **Retry with exponential backoff** — automatic 3-attempt retry on network failure
- **Request timeout protection** — 10-second hard cap on every Supabase query

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────────────┐  │
│  │  30 App  │  │ 14 Shared│  │  Design   │  │  Framer Motion    │  │
│  │  Screens │  │Components│  │  System   │  │  Animations       │  │
│  └─────┬────┘  └─────┬────┘  │ (Tailwind │  │  + Micro-         │  │
│        │             │       │  + Radix) │  │  Interactions     │  │
│        └──────┬──────┘       └───────────┘  └───────────────────┘  │
│               ▼                                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              NAVIGATION (In-Memory Stack Router)               │  │
│  │    pushScreen() · popScreen() · replaceScreen() · goHome()     │  │
│  └─────────────────────────────┬──────────────────────────────────┘  │
│                                ▼                                     │
├──────────────────────────────────────────────────────────────────────┤
│                            DATA LAYER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐  │
│  │  use-supabase│  │ use-realtime │  │  supabase-data.ts          │  │
│  │  (React      │  │ (WebSocket   │  │  (Repository Pattern       │  │
│  │   Hooks)     │  │  Channels)   │  │   1,342 lines of CRUD)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────────┘  │
│         │                 │                     │                     │
│         └─────────────────┼─────────────────────┘                    │
│                           ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    BOOTSTRAP SYSTEM                             │  │
│  │  Network Monitor → Session Manager → Guarded Fetch → Ready     │  │
│  └─────────────────────────────┬──────────────────────────────────┘  │
├────────────────────────────────┼─────────────────────────────────────┤
│                                ▼                                     │
│                       INFRASTRUCTURE                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐  │
│  │   Supabase   │  │  Firebase    │  │  Google Maps  │  │  OTA    │  │
│  │  (DB, Auth,  │  │  Cloud       │  │  Places API   │  │ Update  │  │
│  │   Storage,   │  │  Messaging   │  │  Routes API   │  │ Engine  │  │
│  │   Realtime)  │  │  (FCM Push)  │  │  Nominatim    │  │ (Capgo) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                 CAPACITOR NATIVE BRIDGE                         │  │
│  │   Geolocation · Push · Local Notifs · App Lifecycle · Storage  │  │
│  │   ApkUpdater (Custom Plugin) · Google Auth · Browser           │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| **Rendering** | Next.js Static Export (`output: "export"`) | No server needed — ships as pure HTML/JS/CSS inside Capacitor |
| **Navigation** | Custom in-memory stack | Future-proof for React Navigation migration; no URL routing needed in a native shell |
| **Data layer** | Repository pattern with guard wrappers | Single source of truth; prevents unauthenticated/offline queries at the function level |
| **State** | React Context + module-level caches | Lightweight; no Redux overhead for a mobile-first app |
| **Realtime** | Supabase Postgres Changes | Eliminates polling; sub-second updates for match slots, notifications, invites |
| **Updates** | OTA (Capgo) + Custom APK Updater | Ship JS fixes in minutes; ship native changes via APK self-update |
| **Maps** | Google Places (New) + Routes v2 + Leaflet fallback | Best discovery quality; Leaflet as cost-saving offline fallback |

---

## 📊 By the Numbers

| Metric | Value |
|--------|-------|
| **Total TypeScript files** | 152 |
| **Lines of application code** | 22,143 |
| **App screens** | 30 |
| **Reusable UI components** | 14 custom + 30 Radix primitives |
| **Supabase tables** | 6+ (players, matches, match_players, notifications, chat, app_versions) |
| **Realtime channels** | 5 (matches, match_players, notifications, invites, badge count) |
| **API integrations** | 4 (Supabase, Google Places, Google Routes, Nominatim/OSRM) |
| **Notification channels** | 5 Android channels with priority tiers |
| **OTA modules** | 11 files covering full update lifecycle |
| **Bootstrap stages** | 5 deterministic phases |
| **Domain types** | 28 TypeScript interfaces |

---

## 🛠️ Tech Stack

<table>
<tr>
<td width="50%">

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | Framework (Static Export mode) |
| **React 19** | UI runtime |
| **TypeScript 5.7** | Type safety |
| **Tailwind CSS 4** | Utility-first styling |
| **Radix UI** | 20+ accessible primitives |
| **Framer Motion** | Physics-based animations |
| **Lucide React** | Icon system (560+ icons) |
| **Recharts** | Data visualization |
| **Leaflet** | Open-source map rendering |
| **React Hook Form + Zod** | Form validation |

</td>
<td width="50%">

### Backend & Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Supabase** | Database, Auth, Storage, Realtime |
| **Firebase (FCM)** | Push notifications |
| **Google Places API** | Turf discovery |
| **Google Routes API v2** | Navigation & directions |
| **Nominatim** | Reverse geocoding |
| **OSRM** | Fallback routing engine |
| **Capacitor 8** | Native bridge (Android) |
| **Capgo Updater** | OTA bundle delivery |
| **GitHub Actions** | CI/CD pipeline |
| **Vercel** | Web hosting & analytics |

</td>
</tr>
</table>

---

## 📱 App Screens

<details>
<summary><strong>Click to expand — 30 production screens</strong></summary>

| # | Screen | Description |
|---|--------|-------------|
| 1 | **Splash** | Branded loading with boot diagnostics |
| 2 | **Onboarding** | Feature carousel for first-time users |
| 3 | **Auth Flow** | Google Sign-In + OTP with profile setup |
| 4 | **Home** | Match feed, quick actions, live matches, nearby turfs |
| 5 | **Grounds Hub** | Turf discovery with filters (price, distance, type, rating) |
| 6 | **Ground Detail** | Venue info, photos, amenities, slots, call/navigate actions |
| 7 | **Turf Map** | Interactive Leaflet map with clustered turf pins |
| 8 | **Live Navigation** | Turn-by-turn directions with Google Routes polyline overlay |
| 9 | **Match Detail** | Full match info, squad list, join/request actions, share card |
| 10 | **Create Match** | Multi-step match creation with ground picker, rules, pricing |
| 11 | **My Matches** | Tabbed view: Created / Joined / Pending / History / Invites |
| 12 | **Your Matches** | Quick-access match management |
| 13 | **Manage Requests** | Accept/decline join requests with player profiles |
| 14 | **Players** | Player discovery with skill/availability/distance filters |
| 15 | **Player Profile** | Career stats, recent form, reliability, badge, contact |
| 16 | **Profile** | Self-profile editing (name, avatar, city, zone, phone, role) |
| 17 | **Notifications** | Categorized alerts with read/unread state and realtime badge |
| 18 | **Chat Inbox** | Match chat threads with unread counters |
| 19 | **Chat Room** | In-match messaging with system messages |
| 20 | **Tournaments** | Tournament browser with status filters |
| 21 | **Tournament Detail** | Rules, schedule, entry fee, team count, registration |
| 22 | **Tournament Bracket** | Interactive QF → SF → Final bracket visualization |
| 23 | **Team Registration** | Squad signup for tournaments |
| 24 | **Live Scorecard** | Ball-by-ball scoring with batter/bowler stats |
| 25 | **Score Entry** | Ball-by-ball input for organizers |
| 26 | **Share Card** | Shareable match invite card generation |
| 27 | **Availability Card** | Player availability status display |
| 28 | **Filter Sheet** | Advanced multi-criteria filter bottom sheet |
| 29 | **Offline Screen** | Graceful offline state with retry |
| 30 | **Location Denied** | Permission request flow for location access |

</details>

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **npm** or **pnpm**
- **Android Studio** (for native builds)
- **Supabase** project (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/turf-match.git
cd turf-match
npm install
```

### 2. Configure Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### 3. Run Development Server

```bash
npm run dev
# App runs at http://localhost:3000
```

### 4. Build for Android

```bash
npm run build                    # Next.js static export
npx cap sync android             # Sync web assets to native
npx cap open android             # Open in Android Studio
# Build → Run on emulator/device
```

### 5. Deploy OTA Update

```bash
git push origin main
# GitHub Actions automatically:
# 1. Builds the bundle
# 2. Computes SHA-256 checksum
# 3. Uploads to Supabase Storage
# 4. Inserts version record
# 5. Devices auto-update on next app launch
```

---

## 🗂️ Project Structure

```
turf-match-app-build/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts, metadata, viewport)
│   ├── page.tsx                  # Entry point → mounts AppShell
│   └── globals.css               # Design system tokens + animations
│
├── components/
│   ├── screens/                  # 30 full-page screen components
│   │   ├── home-screen.tsx       # Main feed with match cards
│   │   ├── match-detail-screen.tsx # Match info + squad management
│   │   ├── create-match-screen.tsx # Multi-step match creation
│   │   ├── grounds-hub-screen.tsx  # Turf discovery + filters
│   │   ├── live-scorecard-screen.tsx # Ball-by-ball scoring
│   │   ├── turf-map-screen.tsx   # Interactive map view
│   │   └── ...28 more screens
│   │
│   ├── turfmatch/                # Shared UI components
│   │   ├── app-shell.tsx         # Root shell + screen router
│   │   ├── tm-bottom-nav.tsx     # 5-tab navigation bar
│   │   ├── tm-bottom-sheet.tsx   # Draggable bottom sheet
│   │   ├── match-card.tsx        # Match preview card
│   │   ├── filter-sheet.tsx      # Advanced filter panel
│   │   └── phone-gate.tsx        # Privacy-gated phone input
│   │
│   └── ui/                       # Radix UI primitives (shadcn/ui)
│
├── lib/
│   ├── bootstrap/                # 🛡️ Startup orchestration
│   │   ├── app-bootstrap.tsx     # 5-stage deterministic boot
│   │   ├── session-manager.ts    # Auth hydration + persistence
│   │   ├── network-monitor.ts    # Online/offline detection
│   │   ├── guarded-fetch.ts      # Auth-gated API wrapper
│   │   └── startup-logger.ts     # Boot diagnostics
│   │
│   ├── turfmatch/                # 🏏 Core business logic
│   │   ├── supabase-data.ts      # Repository layer (1,342 lines)
│   │   ├── use-supabase.ts       # React hooks bridge (794 lines)
│   │   ├── use-realtime.ts       # WebSocket subscriptions
│   │   ├── google-maps.ts        # Places + Routes API client
│   │   ├── location-store.tsx    # Geolocation provider
│   │   ├── navigation.tsx        # In-memory stack router
│   │   ├── types.ts              # 28 domain interfaces
│   │   └── data.ts               # Seed/mock data
│   │
│   ├── notifications/            # 🔔 Push notification engine
│   │   ├── notification-service.ts # Orchestrator (366 lines)
│   │   ├── deduplication.ts      # TTL-based event dedup
│   │   ├── deep-link.ts          # URL → screen routing
│   │   ├── engagement.ts         # Delivery analytics
│   │   ├── permission.ts         # Permission flow management
│   │   └── push-token.ts         # FCM token sync
│   │
│   ├── ota/                      # 📦 Over-the-Air updates
│   │   ├── update-manager.ts     # Version check + download
│   │   ├── apk-updater.ts        # Native APK bridge
│   │   ├── rollback-manager.ts   # Safe revert on failure
│   │   ├── version-utils.ts      # Semver comparison
│   │   ├── device-state.ts       # State machine persistence
│   │   └── analytics.ts          # Update event tracking
│   │
│   ├── auth-context.tsx          # Auth state + profile management
│   └── supabase.ts               # Supabase client singleton
│
├── supabase/migrations/          # Database schema migrations
├── android/                      # Capacitor Android project
├── .github/workflows/            # CI/CD pipelines
│   └── ota-deploy.yml            # Automated OTA deployment
└── public/                       # Static assets + icons
```

---

## 🔐 Security & Privacy

| Feature | Implementation |
|---------|---------------|
| **Row-Level Security (RLS)** | Supabase RLS policies on all tables — users can only read/write their own data |
| **Phone Privacy Gate** | Phone numbers revealed ONLY to confirmed squad members during match window |
| **Auth Guard** | `guardedFetch()` wrapper prevents all API calls before auth confirmation |
| **Token Rotation** | Supabase handles JWT refresh automatically |
| **API Key Scoping** | Client-side uses anon key (read-only); service key restricted to CI/CD |
| **Checksum Verification** | OTA bundles validated via SHA-256 before installation |
| **Input Validation** | Zod schemas on all form inputs |
| **Install Permissions** | Android `REQUEST_INSTALL_PACKAGES` permission flow for APK updates |

---

## 📈 Business Model & Market

### Market Opportunity

| Metric | Value |
|--------|-------|
| **TAM** (Total Addressable Market) | ₹15,000 Cr ($1.8B) — Indian recreational sports |
| **SAM** (Serviceable) | ₹3,000 Cr ($360M) — Urban box cricket + turf bookings |
| **SOM** (Obtainable Year 1) | ₹50 Cr ($6M) — Pune + Mumbai metro |
| **Target users** | 30M+ recreational cricketers in India |
| **Turfs in India** | 50,000+ and growing 25% YoY |

### Revenue Streams

```
┌─────────────────────────────────────────────────────────────┐
│  💰 REVENUE MODEL                                           │
│                                                             │
│  1. 🎫 Match Fees         Platform commission on per-player │
│                           pricing (5-10% per transaction)   │
│                                                             │
│  2. 🏟️ Turf Partnerships  Featured listings, premium        │
│                           placement, booking commissions    │
│                                                             │
│  3. 🏆 Tournament Hosting  Entry fee commission + sponsored │
│                           tournaments with prize pools      │
│                                                             │
│  4. ⭐ Player Premium     Priority matching, advanced stats,│
│                           badge boosts, profile highlights  │
│                                                             │
│  5. 📊 Data Insights      Anonymized sports analytics for   │
│                           brands, equipment makers, turfs   │
└─────────────────────────────────────────────────────────────┘
```

### Competitive Advantage

| Competitor | What They Do | What We Do Better |
|-----------|-------------|-------------------|
| **Playo** | Match listing (manual) | Real-time matchmaking + live scoring + navigation |
| **Hudle** | Venue booking only | End-to-end: discover → match → navigate → play → score |
| **SportVot** | Live streaming | We focus on grassroots: getting you on the ground playing |
| **WhatsApp Groups** | Chaos | Structured matchmaking with reliability scores |

---

## 🧪 Engineering Highlights

### 1. Race-Condition-Free Bootstrap
The app uses a **deterministic 5-stage boot sequence** that solves the #1 problem with Capacitor apps: startup race conditions.

```typescript
// Boot phases execute in strict order:
NETWORK_READY → AUTH_HYDRATED → QUERY_READY → LOCATION_RESOLVED → APP_READY

// Each phase gates the next — impossible for a query to fire before auth
```

### 2. Realtime Without Polling
Every data hook uses **Supabase Realtime channels** instead of polling:

```typescript
// Match slots update across all devices in <500ms
useRealtimeMatches(onEvent)        // matches table
useRealtimeMatchPlayers(matchId)   // match_players table
useRealtimeNotifications(userId)   // notifications table
useRealtimeMyInvites(userId)       // invite changes
```

### 3. Intelligent Turf Relevance Scoring
We built a custom **ML-free relevance engine** that scores Google Places results:

```typescript
// Score = keyword matches (×25) + address matches (×5) + sports type bonus (×15)
// Hard-reject: 40+ blocked Google types (restaurants, hotels, banks, etc.)
// Hard-require: At least one turf keyword OR one sports Google type
```

### 4. Graceful Degradation Stack
```
Google Routes API  →  fails?  →  OSRM Open Source Router
Capacitor GPS      →  fails?  →  Browser Geolocation API
Supabase query     →  times out (10s)?  →  Return fallback + retry with backoff
Loading state      →  stuck > 8s?  →  Force-resolve to prevent infinite spinners
```

### 5. Zero-Downtime OTA Pipeline
```
git push main  →  GitHub Actions  →  Next.js build  →  zip + SHA-256
                                  →  Upload to Supabase Storage
                                  →  Insert version record (channel, rollout %)
                                  →  Devices auto-update on next launch
                                  →  Rollback if 3 consecutive failures detected
```

---

## 🎨 Design Language

| Element | Specification |
|---------|--------------|
| **Color Palette** | Deep Navy (`#0c1324`) + Mint Primary (`#4edea3`) + Amber Secondary (`#ffb95f`) |
| **Surface Elevation** | 7-level elevation ladder (lowest → low → surface → container → high → highest → bright) |
| **Typography** | Lexend (body) + Anton (display headings) |
| **Corners** | 0.75rem base radius |
| **Animations** | Custom keyframes: `fade-in`, `slide-up`, `pulse-glow`, `screen-enter` |
| **Interaction** | Press feedback (scale 0.97 + opacity 0.85), card lift effect |
| **Accessibility** | `prefers-reduced-motion` media query support, semantic HTML |
| **Performance** | `content-visibility: auto`, GPU-accelerated transforms, lazy image loading |
| **Dark Mode** | Dark-first design — the entire app is built for dark backgrounds |

---

## 🗺️ Roadmap

| Phase | Timeline | Features |
|-------|----------|----------|
| ✅ **v1.0 — MVP** | Complete | Matchmaking, turf discovery, navigation, profiles, notifications, OTA |
| 🔄 **v1.1 — Social** | Q3 2026 | Friend system, team creation, match history leaderboards |
| 📅 **v1.2 — Payments** | Q3 2026 | UPI integration, in-app payment collection, split bills |
| 🤖 **v2.0 — AI** | Q4 2026 | ML-powered player recommendations, optimal time/venue suggestions |
| 🍎 **v2.1 — iOS** | Q1 2027 | iOS build with Capacitor (same codebase) |
| ⚽ **v3.0 — Multi-sport** | Q2 2027 | Football, badminton, basketball, tennis |

---

## ❓ FAQ

**"Is this actually live or just a hackathon prototype?"**

It's live. Download it from [www.turfmatch.app](https://www.turfmatch.app) right now on any Android phone. We have OTA updates running, push notifications working, real Google Maps turf discovery — the whole thing. This isn't a Figma mockup.

**"How do you find turfs? Is it a static database?"**

No static database. We hit the Google Places API (New) in real-time, fire 4 parallel searches, score every result with our own relevance engine, filter out the junk (Google loves returning restaurants and hotels), and show you actual turfs sorted by distance. Every time you open the app, you get fresh results based on where you are right now.

**"What happens if I'm offline or have bad network?"**

The app doesn't crash or hang. We have a full offline resilience stack — cached data survives across tabs and app restarts, every API call has a 10-second hard timeout, failed requests retry 3 times with exponential backoff, and there's a loading safety net that force-resolves after 8 seconds so you're never stuck on a spinner. If you're completely offline, you see a clean offline banner with a retry button.

**"Do you have your own backend server?"**

No. Zero server cost. The app is a Next.js static export (pure HTML/JS/CSS) wrapped in Capacitor for Android. All the backend — database, auth, file storage, realtime WebSockets — is Supabase. Push notifications go through Firebase Cloud Messaging. This means we can serve thousands of users on Supabase's free tier before we ever need to pay for infrastructure.

**"How do OTA updates work?"**

When we push code to `main`, a GitHub Actions workflow automatically builds the Next.js bundle, zips it, computes a SHA-256 checksum, uploads it to Supabase Storage, and inserts a version record. Next time any user opens the app, it checks for updates, downloads the new bundle, verifies the checksum, and hot-swaps the code. No app store review needed. If something goes wrong, it auto-rolls back after 3 consecutive failures.

**"Why not React Native or Flutter?"**

Because we wanted to move fast with a web tech stack we already knew (React/Next.js) and still ship a native Android app. Capacitor gives us native APIs (GPS, push, filesystem) while letting us write everything in TypeScript. When we're ready for iOS, we just run `npx cap add ios` — same codebase, no rewrite.

**"Can I use this for football / badminton / other sports?"**

Not yet, but it's coming. The turf search already discovers football turfs and futsal courts. The data model supports a `sportType` field on matches. Multi-sport support is on the v3.0 roadmap.

**"How is player privacy handled?"**

Phone numbers are never shown publicly. We have a "Phone Gate" — your number is shared only with confirmed squad members (people who are actually playing in the same match as you) and only during the match window. Supabase Row-Level Security ensures users can only read/write their own data at the database level.

**"What's the tech stack in one sentence?"**

Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Supabase (Postgres + Auth + Realtime + Storage) + Capacitor 8 (Android) + Firebase FCM + Google Places/Routes APIs + GitHub Actions CI/CD.

---

<p align="center">
  <br/>
  <strong>🏏 Stop searching WhatsApp groups. Start playing.</strong>
  <br/><br/>
  <a href="https://www.turfmatch.app">
    <img src="https://img.shields.io/badge/Download_TurfMatch-4edea3?style=for-the-badge&logoColor=white&logo=google-play" alt="Download" />
  </a>
  <br/><br/>
  <sub>Built with ❤️ in Pune, India 🇮🇳</sub>
  <br/>
  <sub>© 2026 TurfMatch · All rights reserved</sub>
</p>
