"use client"

import React from "react"
import { NavProvider, useNav, type ScreenName } from "@/lib/turfmatch/navigation"
import { AvailabilityProvider } from "@/lib/turfmatch/availability-store"
import { LocationProvider } from "@/lib/turfmatch/location-store"
import { NearbyTurfsProvider } from "@/lib/turfmatch/nearby-turfs-store"
import { AuthProvider } from "@/lib/auth-context"
import { AppBootstrapProvider } from "@/lib/bootstrap/app-bootstrap"
import { TmAppFrame } from "@/components/turfmatch/tm-app-frame"
import { TmBottomNav } from "@/components/turfmatch/tm-bottom-nav"
import { OfflineBanner } from "@/components/turfmatch/offline-banner"
import { NotificationProvider } from "@/components/notifications/notification-provider"
import { SplashScreen } from "@/components/screens/splash-screen"
import { OnboardingScreen } from "@/components/screens/onboarding-screen"
import { AuthFlowScreen } from "@/components/screens/auth-flow-screen"
import { HomeScreen } from "@/components/screens/home-screen"
import { NotificationsScreen } from "@/components/screens/notifications-screen"
import { PlayersScreen } from "@/components/screens/players-screen"
import { PlayerProfileScreen } from "@/components/screens/player-profile-screen"
import { GroundsHubScreen } from "@/components/screens/grounds-hub-screen"
import { GroundDetailScreen } from "@/components/screens/ground-detail-screen"
import { TurfMapScreen } from "@/components/screens/turf-map-screen"
import { TournamentsScreen } from "@/components/screens/tournaments-screen"
import { TournamentDetailScreen } from "@/components/screens/tournament-detail-screen"
import { TournamentBracketScreen } from "@/components/screens/tournament-bracket-screen"
import { TeamRegistrationScreen } from "@/components/screens/team-registration-screen"
import { ChatInboxScreen } from "@/components/screens/chat-inbox-screen"
import { ChatRoomScreen } from "@/components/screens/chat-room-screen"
import { ProfileScreen } from "@/components/screens/profile-screen"
import { CreateMatchScreen } from "@/components/screens/create-match-screen"
import { MatchDetailScreen } from "@/components/screens/match-detail-screen"
import { ManageRequestsScreen } from "@/components/screens/manage-requests-screen"
import { ScoreEntryScreen } from "@/components/screens/score-entry-screen"
import { LiveScorecardScreen } from "@/components/screens/live-scorecard-screen"
import { OfflineScreen } from "@/components/screens/offline-screen"
import { LocationDeniedScreen } from "@/components/screens/location-denied-screen"
import { LiveNavigationScreen } from "@/components/screens/live-navigation-screen"
import { YourMatchesScreen } from "@/components/screens/your-matches-screen"
import { MyMatchesListScreen } from "@/components/screens/my-matches-list-screen"
import { ApkUpdaterProvider } from "@/lib/ota/use-apk-updater"
import { ForceUpdateGate } from "@/components/ota/force-update-gate"

// Tabs that should reveal the persistent bottom nav.
// All TAB_SCREENS plus profile (reachable via avatar tap on home).
const SHOW_BOTTOM_NAV_ON: ReadonlySet<ScreenName> = new Set([
  "home",
  "tournaments",
  "groundsHub",
  "turfMap",
  "chatInbox",
  "profile",
  "yourMatches",
  "createdMatches",
  "joinedMatches",
  "pendingRequests",
  "matchInvites",
  "matchHistory",
])

function ScreenRouter() {
  const { current } = useNav()
  const params = current.params as Record<string, string | undefined>

  switch (current.screen) {
    case "splash":
      return <SplashScreen />
    case "onboarding":
      return <OnboardingScreen />
    case "auth":
      return <AuthFlowScreen />
    case "home":
      return <HomeScreen />
    case "notifications":
      return <NotificationsScreen />
    case "players":
      return <PlayersScreen />
    case "playerProfile":
      return <PlayerProfileScreen playerId={params.playerId} />
    case "groundsHub":
      return <GroundsHubScreen />
    case "groundDetail":
      return <GroundDetailScreen groundId={params.groundId} />
    case "turfMap":
      return <TurfMapScreen />
    case "tournaments":
      return <TournamentsScreen />
    case "tournamentDetail":
      return <TournamentDetailScreen tournamentId={params.tournamentId} />
    case "tournamentBracket":
      return <TournamentBracketScreen tournamentId={params.tournamentId} />
    case "teamRegistration":
      return <TeamRegistrationScreen tournamentId={params.tournamentId} />
    case "chatInbox":
      return <ChatInboxScreen />
    case "chatRoom":
      return <ChatRoomScreen matchId={params.matchId} />
    case "profile":
      return <ProfileScreen />
    case "createMatch":
      return <CreateMatchScreen />
    case "matchDetail":
      return <MatchDetailScreen matchId={params.matchId} inviteAction={params.inviteAction} />
    case "manageRequests":
      return <ManageRequestsScreen matchId={params.matchId} />
    case "scoreEntry":
      return <ScoreEntryScreen matchId={params.matchId} />
    case "liveScorecard":
      return <LiveScorecardScreen matchId={params.matchId} />
    case "offline":
      return <OfflineScreen />
    case "locationDenied":
      return <LocationDeniedScreen />
    case "liveNavigation":
      return <LiveNavigationScreen destLat={Number(params.lat)} destLng={Number(params.lng)} destName={params.name} />
    case "yourMatches":
      return <YourMatchesScreen />
    case "createdMatches":
      return <MyMatchesListScreen type="created" />
    case "joinedMatches":
      return <MyMatchesListScreen type="joined" />
    case "pendingRequests":
      return <MyMatchesListScreen type="pending" />
    case "matchInvites":
      return <MyMatchesListScreen type="invites" />
    case "matchHistory":
      return <MyMatchesListScreen type="history" />
    default:
      return <HomeScreen />
  }
}

function ShellInner() {
  const { current, goBack, navigate, stack } = useNav()
  const showBottomNav = SHOW_BOTTOM_NAV_ON.has(current.screen)

  // Refs to avoid stale closures in the Capacitor listener
  const stackRef = React.useRef(stack)
  const currentRef = React.useRef(current)
  const goBackRef = React.useRef(goBack)
  const navigateRef = React.useRef(navigate)
  stackRef.current = stack
  currentRef.current = current
  goBackRef.current = goBack
  navigateRef.current = navigate

  /* ── Android hardware back button ── */
  React.useEffect(() => {
    let removeListener: (() => void) | undefined
    let cancelled = false

    import("@capacitor/app").then(({ App }) => {
      if (cancelled) return
      App.addListener("backButton", () => {
        if (cancelled) return
        if (stackRef.current.length > 1) {
          goBackRef.current()
        } else if (currentRef.current.screen !== "home") {
          navigateRef.current("home")
        } else {
          App.minimizeApp()
        }
      }).then((handle) => {
        if (cancelled) { handle.remove(); return }
        removeListener = () => handle.remove()
      })
    }).catch(() => {})

    return () => {
      cancelled = true
      removeListener?.()
    }
  }, []) // only register once

  return (
    <TmAppFrame>
      <ForceUpdateGate>
        <OfflineBanner />
        <ScreenRouter />
        {showBottomNav ? <TmBottomNav /> : null}
      </ForceUpdateGate>
    </TmAppFrame>
  )
}

export function AppShell() {
  return (
    <AppBootstrapProvider>
      <ApkUpdaterProvider>
        <AuthProvider>
          <NavProvider>
            <LocationProvider>
              <NearbyTurfsProvider>
                <AvailabilityProvider>
                  <NotificationProvider>
                    <ShellInner />
                  </NotificationProvider>
                </AvailabilityProvider>
              </NearbyTurfsProvider>
            </LocationProvider>
          </NavProvider>
        </AuthProvider>
      </ApkUpdaterProvider>
    </AppBootstrapProvider>
  )
}
