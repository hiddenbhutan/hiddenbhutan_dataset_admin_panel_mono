import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// Next.js doesn't always load `.env.local` before evaluating `next.config.ts`,
// so loadEnvConfig populates `process.env` here for sure. Required so the
// `env` map below sees the real SESSION_SECRET and embeds it into the Edge
// runtime bundle that `proxy.ts` runs in.
loadEnvConfig(process.cwd());

const nextConfig: NextConfig = {
  env: {
    SESSION_SECRET:       process.env.SESSION_SECRET ?? '',
    SESSION_COOKIE_NAME:  process.env.SESSION_COOKIE_NAME ?? 'hb_session',
    SESSION_MAX_AGE_DAYS: process.env.SESSION_MAX_AGE_DAYS ?? '14',
  },
};

export default nextConfig;
