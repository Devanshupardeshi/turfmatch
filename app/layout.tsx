import type { Metadata, Viewport } from "next"
import { Anton, Lexend } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
})
const anton = Anton({
  subsets: ["latin"],
  variable: "--font-anton",
  weight: "400",
  display: "swap",
})

export const metadata: Metadata = {
  title: "TurfMatch — Find Players. Build Teams. Run Tournaments.",
  description:
    "TurfMatch is the operating system for recreational cricket in India. Find available players nearby, host turf matches, and run tournaments — all in one app.",
  applicationName: "TurfMatch",
  keywords: [
    "cricket",
    "turf",
    "match",
    "tournament",
    "Pune",
    "India",
    "box cricket",
    "players",
  ],
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#0c1324",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${lexend.variable} ${anton.variable} bg-background`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background text-foreground selection:bg-primary/30" suppressHydrationWarning>
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
