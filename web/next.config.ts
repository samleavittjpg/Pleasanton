import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // RSC / devtools fetches can fail in Safari (and some setups) when the tab is opened as
  // `localhost` but the dev server was started with `-H 127.0.0.1` (or the reverse): different
  // origins. Allow both loopback hostnames for dev-only routes.
  allowedDevOrigins: ["localhost", "127.0.0.1", "[::1]"],
};

export default nextConfig;
