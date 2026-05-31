/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — required so Capacitor can package
  // the web build into the Android shell as plain HTML/JS.
  output: "export",
  // Capacitor doesn't run a Next.js server, so disable
  // server-side image optimization.
  images: {
    unoptimized: true,
  },
  // Static hosts and Capacitor handle routes more reliably
  // when every page resolves as a folder + index.html.
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig