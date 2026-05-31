// Core domain types for TurfMatch — Phase 1
// Mirrors the PRD data model + repo UI/UX details (availability, reliability,
// career stats, recent form, brackets, fixtures, ball-by-ball, attendance).

export type PlayerRole = "Batsman" | "Bowler" | "All-Rounder" | "Wicket-Keeper"

export type AvailabilityWindow =
  | "today"
  | "tomorrow"
  | "this_weekend"
  | "not_available"

export interface CareerStats {
  matches: number
  winRatePct: number
  runs: number
  runsTopPercentile?: number  // e.g. 5 → "Top 5%"
  wickets: number
  economy?: number            // bowling economy
}

export interface RecentMatchResult {
  result: "W" | "L" | "T"
  vsTeam: string
  margin: string              // "by 4 wkts", "by 18 runs"
}

export interface Player {
  id: string
  name: string
  avatar: string
  role: PlayerRole
  city: string
  zone: string                // Pune neighborhood: Baner, Wakad, etc.
  rating: number              // 1.0 - 5.0
  reliability: number         // 0 - 100 (join-rate)
  level: number               // gamified level e.g. 42
  badge?: "Elite" | "Rising" | "Pro"
  careerStats: CareerStats
  recentForm: RecentMatchResult[]
  availability: AvailabilityWindow
  distanceKm: number          // distance from logged-in user
  isFriend: boolean
  phone?: string              // privacy-gated phone number
}

export type PitchType = "Hard Pitch" | "Astroturf" | "Dusty Pitch" | "Concrete"
export type GroundCategory = "Box Cricket" | "Net Practice" | "Full Ground" | "Football Turf"

export interface Ground {
  id: string
  name: string
  location: string
  zone: string
  distanceKm: number
  rating: number
  userRatingCount?: number
  pricePerHour: number
  image: string
  features: string[]
  availableSlots: string[]    // "06:00 AM"
  category: GroundCategory
  pitchType: PitchType
  verified: boolean
  upiReady: boolean
  liveTeamsToday: number      // "12 teams playing here today"
  // Approximate lat/lng for map pins (mock — Pune coordinates).
  lat: number
  lng: number
  /** Phone number from Google Places (may be absent) */
  phoneNumber?: string
}



export type MatchStatus =
  | "open"
  | "filling_fast"
  | "locked"
  | "live"
  | "completed"
  | "cancelled"
  | "upcoming"

export type MatchVisibility = "public" | "private" | "invite" | "squad"

export type SkillLevel = "Beginner" | "Intermediate" | "Pro"

export interface MatchScore {
  teamA: number
  wicketsA: number
  oversA: number
  teamB: number
  wicketsB?: number
  oversB?: number
}

export interface Match {
  id: string
  title: string
  ground: Ground
  startsAt: string            // human readable
  date: string
  startsInLabel?: string      // "LIVE IN 2H"

  skillLevel: SkillLevel
  visibility: MatchVisibility
  totalSlots: number
  filledSlots: number
  pricePerPlayer: number
  organizer: Player
  players: Player[]
  rules: string[]
  status: MatchStatus
  score: MatchScore | null
  liveBalls?: string[]        // e.g. ["4","1","W","0","6","1"]
  durationMinutes?: number    // match duration in minutes
  endsAt?: string             // ISO timestamp when match ends
  description?: string        // optional match description
  sportType?: string          // cricket, football, etc.
  /** Day of week shorthand used in filters */
  day?: string
  /** Slots info for availability filtering */
  slots?: { open: number }
  /** ISO start time for sorting */
  startTime?: string
}

/** Match-host inbox for join requests. */
export interface MatchJoinRequest {
  id: string
  matchId: string
  player: Player
  status: "pending" | "accepted" | "declined"
  requestedAt: string
}

export type TournamentStatus = "Registering" | "Live" | "Completed"

export interface BracketTeam {
  id: string
  name: string
  shortCode: string           // "DK", "PS"
  logoColor: string           // hex
  score?: number | "-"        // numeric or "-" for not played, "Live" handled via fixture
}

export interface BracketMatch {
  id: string
  round: "QF" | "SF" | "F"
  teamA: BracketTeam
  teamB: BracketTeam
  winnerId?: string
  isLive?: boolean
  isPending?: boolean         // "Winner QF X"
  pendingLabel?: string
}

export interface TournamentFixture {
  id: string
  label: string               // "QUARTER FINAL 2"
  time: string                // "8:00 PM" or "LIVE NOW"
  isLive?: boolean
  teamA: BracketTeam & { state?: string }
  teamB: BracketTeam & { state?: string }
  oversInfo?: string          // "OVERS: 14.2/20"
}

export interface Tournament {
  id: string
  name: string
  status: TournamentStatus
  prize: string
  prizeAmount: number
  dates: string
  startsAt: string
  format: string              // "16 Teams • Knockout"
  teamsRegistered: number
  teamsTotal: number
  registrationClosesIn?: string
  entryFee: number
  image: string
  rules: string[]
  bracket: BracketMatch[]
  fixtures: TournamentFixture[]
}

/** Live ball-by-ball state (live scorecard). */
export interface BallEvent {
  id: string
  label: "0" | "1" | "2" | "3" | "4" | "6" | "W" | "Wd" | "Nb" | "B" | "Lb"
  isWicket?: boolean
}

export interface LiveBatter {
  id: string
  name: string
  isStriker: boolean
  runs: number
  balls: number
  fours: number
  sixes: number
}

export interface LiveBowler {
  id: string
  name: string
  overs: string               // "2.2"
  maidens: number
  runs: number
  wickets: number
  economy: number
}

export interface LiveScorecard {
  matchId: string
  innings: 1 | 2
  overLabel: string           // "OVER 14.2"
  teamABBattingLabel: string  // "MUMBAI STRIKERS vs DELHI INVINCIBLES"
  totalRuns: number
  totalWickets: number
  currentRunRate: number
  projected: number
  target: number | null
  recentBalls: BallEvent[]
  striker: LiveBatter
  nonStriker: LiveBatter
  bowler: LiveBowler
}

export type NotificationKind =
  | "match_join"
  | "match_reminder"
  | "match_cancelled"
  | "friend_request"
  | "tournament"
  | "system"
  | "invite"

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  time: string
  read: boolean
  actorAvatar?: string
  entityId?: string
}

export interface ChatThread {
  id: string
  matchId: string
  title: string
  lastMessage: string
  lastMessageTime: string
  unread: number
  isLive: boolean
}

export type ChatMessageKind = "text" | "system" | "location"

export interface ChatMessage {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  text: string
  time: string
  isMine?: boolean
  kind?: ChatMessageKind
  read?: boolean
}
