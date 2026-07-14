import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import GlassFilters from "@/components/GlassFilters";
import LenisProvider from "@/components/LenisProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

// The canonical VASEY/AI mono face, self-hosted (OFL — see app/fonts/) so
// production builds never depend on a remote font fetch.
const jetbrainsMono = localFont({
  src: [
    { path: "./fonts/jetbrains-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jetbrains-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Condensed fallback for the display face on platforms without Arial
// Narrow / Avenir Next Condensed (Android, Linux) — without it the hero
// wordmark falls back to a wide sans and clips off-screen. Slotted AFTER
// the Apple faces in --font-display, so iOS rendering is unchanged.
const archivoNarrow = localFont({
  src: [{ path: "./fonts/archivo-narrow-latin-400-normal.woff2", weight: "400", style: "normal" }],
  variable: "--font-archivo-narrow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "shortORDER — natural language to Apple Shortcuts",
  description:
    "Tell it what you want. Order up. Describe an iPhone automation in plain language and get a runnable Apple Shortcut — imported directly or as exact build steps.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "shortORDER",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${archivoNarrow.variable}`}>
      <body>
        <GlassFilters />
        <ServiceWorkerRegister />
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
