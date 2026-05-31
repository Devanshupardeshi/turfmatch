"use client"

import { cn } from "@/lib/utils"
import type { ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost"

interface TmButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: Variant
  fullWidth?: boolean
  loading?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_24px_var(--brand-glow)]",
  secondary:
    "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700",
  outline:
    "bg-transparent text-emerald-400 border-2 border-emerald-500 hover:bg-emerald-500/10",
  danger:
    "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30",
  ghost: "bg-transparent text-slate-400 hover:text-white",
}

export function TmButton({
  children,
  variant = "primary",
  fullWidth = true,
  loading = false,
  disabled,
  className,
  ...props
}: TmButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      {...props}
      disabled={isDisabled}
      className={cn(
        "font-semibold rounded-2xl py-3.5 px-6 text-base",
        "transition-all duration-150 active:scale-[0.97]",
        "flex items-center justify-center gap-2",
        VARIANTS[variant],
        fullWidth && "w-full",
        isDisabled && "opacity-50 cursor-not-allowed active:scale-100",
        className,
      )}
    >
      {loading ? (
        <span className="inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  )
}
