import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        // The Shortcuts importer fetches this cross-origin from Apple's side;
        // the content type and disposition are set in the route handler.
        source: "/api/shortcut/:id",
        headers: [{ key: "Cache-Control", value: "public, max-age=300" }],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
