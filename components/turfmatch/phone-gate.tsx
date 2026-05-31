"use client"

import { useState } from "react"
import { Phone, X, Shield } from "lucide-react"
import { TmButton } from "./tm-button"
import { useAuth } from "@/lib/auth-context"

/**
 * Phone Gate — a modal overlay that blocks the user from proceeding
 * until they provide a phone number. Used when trying to create/join matches.
 */
export function PhoneGate({
  isOpen,
  onClose,
  onComplete,
}: {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}) {
  const { updateProfile } = useAuth()
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const isValid = phone.replace(/\D/g, "").length >= 10

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setError(null)
    try {
      await updateProfile({ phone: phone.trim() })
      onComplete()
    } catch {
      setError("Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border-t border-slate-700 rounded-t-3xl p-6 pb-10 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Phone Required</h3>
              <p className="text-slate-400 text-xs">For match-day coordination</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
          Your phone number is shared <strong className="text-white">only with confirmed squad members</strong> during
          the match window. It&apos;s never shown publicly.
        </p>

        <div className="relative mb-4">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            autoFocus
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}

        <TmButton onClick={handleSave} disabled={!isValid || saving}>
          {saving ? "Saving..." : "Save & Continue"}
        </TmButton>
      </div>
    </div>
  )
}
