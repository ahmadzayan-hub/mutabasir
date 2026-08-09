import type { NextConfig } from "next";

// Strict CSP that supports our specific runtime needs:
//   - pdfjs-dist worker fetched from cdn.jsdelivr.net (with cdnjs backup)
//   - @mlc-ai/web-llm downloading model weights from huggingface.co and
//     spawning WebWorkers from blob: URLs
//   - Supabase auth + REST + realtime to *.supabase.co
//   - Dubai display font via fonts.cdnfonts.com
// `unsafe-inline` on script-src is required by Next.js's inline
// hydration bootstrap; the framework does not yet ship a
// nonce-per-request path that works with the App Router streaming
// renderer. Everything else is tightly locked down.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://huggingface.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.cdnfonts.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.cdnfonts.com",
  "worker-src 'self' blob:",
  "connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://huggingface.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "manifest-src 'self'",
  "media-src 'self' data: blob:",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
