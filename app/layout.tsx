import type { Metadata, Viewport } from "next";
import GlassFilters from "@/components/GlassFilters";
import LenisProvider from "@/components/LenisProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

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
    <html lang="en">
      <body>
        <GlassFilters />
        <ServiceWorkerRegister />
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
