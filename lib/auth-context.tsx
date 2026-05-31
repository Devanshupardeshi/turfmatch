"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase, getSession, waitForAuthInit } from "@/lib/bootstrap/session-manager"
import { startupLog } from "@/lib/bootstrap/startup-logger"
import { resolveLocation } from "@/lib/turfmatch/location-store"
import type { User, Session } from "@supabase/supabase-js"

interface PlayerProfile {
  id: string
  name: string
  email: string
  avatar: string
  role: string
  city: string
  zone: string
  rating: number
  reliability: number
  level: number
  badge: string | null
  matches_played: number
  availability: string
  phone?: string
  push_token?: string | null
  push_token_platform?: string | null
  push_token_updated_at?: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: PlayerProfile | null
  loading: boolean
  isReady: boolean
  signInWithGoogle: () => Promise<void>
  signInWithOtp: (email: string) => Promise<{ error: string | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null; isNewUser: boolean }>
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<PlayerProfile>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("id", userId)
      .single()
    if (error) {
      console.error("[AuthContext] fetchProfile error:", error.message)
      return null
    }
    if (data) {
      console.log("[AuthContext] fetchProfile read:", { zone: data.zone, city: data.city, name: data.name })
      setProfile(data as PlayerProfile)
    }
    return data
  }

  // Auto-create a player profile if one doesn't exist yet
  const ensureProfile = async (authUser: User) => {
    const existing = await fetchProfile(authUser.id)
    if (!existing) {
      const email = authUser.email || ""
      // Try to detect real location; fallback to generic Pune if geolocation fails
      let detectedCity = "Pune"
      let detectedZone = "Pune"
      try {
        const loc = await resolveLocation()
        const parts = loc.location.split(", ")
        detectedZone = parts[0] || "Pune"
        detectedCity = parts[1] || "Pune"
        startupLog.info('AuthContext', 'Detected location for new profile', { zone: detectedZone, city: detectedCity })
      } catch (e: any) {
        startupLog.warn('AuthContext', 'Geolocation failed for profile creation, using fallback', { message: e?.message })
      }
      await supabase.from("players").insert({
        id: authUser.id,
        name: email.split("@")[0],
        email: email,
        avatar: `https://i.pravatar.cc/240?u=${authUser.id}`,
        role: "Batsman",
        city: detectedCity,
        zone: detectedZone,
        rating: 4.0,
        reliability: 100,
        level: 1,
        matches_played: 0,
        availability: "today",
      })
      await fetchProfile(authUser.id)
    }
  }

  useEffect(() => {
    startupLog.info('AuthContext', 'AuthProvider mounting...')
    let cancelled = false

    // The bootstrap provider already initialized auth.
    // We just need to wait for it, then sync our local state.
    waitForAuthInit().then(() => {
      if (cancelled) return
      const session = getSession()
      startupLog.info('AuthContext', 'Auth init complete', { hasSession: !!session, userId: session?.user?.id })
      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        ensureProfile(session.user).then(() => {
          if (!cancelled) {
            startupLog.info('AuthContext', 'Profile ensured, ready')
            setLoading(false)
            setIsReady(true)
          }
        }).catch(() => {
          if (!cancelled) {
            startupLog.warn('AuthContext', 'Profile ensure failed, ready anyway')
            setLoading(false)
            setIsReady(true)
          }
        })
      } else {
        setLoading(false)
        setIsReady(true)
      }
    })

    // Listen for auth changes (login, logout, OTP verification)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return
        startupLog.info('AuthContext', `auth state changed: ${_event}`)
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await ensureProfile(session.user)
        } else {
          setProfile(null)
        }
        setLoading(false)
        setIsReady(true)
      }
    )

    // Handle deep links for Google OAuth on native Android
    if (typeof window !== "undefined") {
      import("@capacitor/core").then(({ Capacitor }) => {
        if (Capacitor.isNativePlatform()) {
          import("@capacitor/app").then(({ App }) => {
            App.addListener("appUrlOpen", async (event) => {
              if (event.url.includes("com.turfmatch.app://callback")) {
                const url = new URL(event.url.replace("#", "?"))
                const access_token = url.searchParams.get("access_token")
                const refresh_token = url.searchParams.get("refresh_token")
                if (access_token && refresh_token) {
                  await supabase.auth.setSession({ access_token, refresh_token })
                }
                import("@capacitor/browser").then(({ Browser }) => {
                  Browser.close().catch(() => {})
                })
              }
            })
          })
        }
      })
    }

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Google OAuth handled correctly for both Web and Native Capacitor
  const signInWithGoogle = async () => {
    let isNative = false
    try {
      const { Capacitor } = await import("@capacitor/core")
      isNative = Capacitor.isNativePlatform()
    } catch (e) {
      // Not native
    }

    if (isNative) {
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth")
      GoogleAuth.initialize({
        clientId: "432044680862-3cbspf7ou6dkads002ojeg61sn2fh5uv.apps.googleusercontent.com",
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      })
      const googleUser = await GoogleAuth.signIn()
      if (googleUser?.authentication?.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: googleUser.authentication.idToken,
          access_token: googleUser.authentication.accessToken
        })
        if (error) throw error
      } else {
        throw new Error("Google Sign-In cancelled or failed")
      }
    } else {
      const redirectTo = window.location.origin
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      })
    }
  }

  // Send 6-digit OTP to email
  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    })
    return { error: error?.message ?? null }
  }

  // Verify the OTP code the user entered
  const verifyOtp = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    })
    if (error) {
      return { error: error.message, isNewUser: false }
    }
    // Check if this user already has a player profile
    const authUser = data.user
    if (authUser) {
      const { data: existingProfile } = await supabase
        .from("players")
        .select("id")
        .eq("id", authUser.id)
        .single()
      return { error: null, isNewUser: !existingProfile }
    }
    return { error: null, isNewUser: true }
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      await ensureProfile(data.user)
    }
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const updateProfile = async (data: Partial<PlayerProfile>) => {
    if (!user) {
      startupLog.warn('AuthContext', 'updateProfile: no user')
      return
    }
    startupLog.info('AuthContext', 'updateProfile', { userId: user.id, fields: Object.keys(data) })
    const { error } = await supabase.from("players").update(data).eq("id", user.id)
    if (error) {
      startupLog.error('AuthContext', 'updateProfile DB error', { message: error.message, code: error.code })
      throw new Error(`Failed to update profile: ${error.message}`)
    }
    startupLog.info('AuthContext', 'updateProfile DB success')
    await fetchProfile(user.id)
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isReady,
        signInWithGoogle,
        signInWithOtp,
        verifyOtp,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
