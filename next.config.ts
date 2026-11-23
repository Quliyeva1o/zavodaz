import type { NextConfig } from "next";

// Shared hosting (cPanel / CloudLinux) shows the host's 32 CPUs but limits the account to
// one: `NEXT_BUILD_CPUS=1 npm run build` keeps the build's workers inside that limit.
const buildCpus = Number(process.env.NEXT_BUILD_CPUS) || undefined;

const nextConfig: NextConfig = {
  experimental: {
    ...(buildCpus ? { cpus: buildCpus, staticGenerationMaxConcurrency: 2 } : {}),
    // Admin cover upload: an 8 MB image (MAX_UPLOAD_BYTES) plus the other form fields and multipart overhead.
    // The default is 1 MB. The upload form also checks the size in the browser before sending.
    serverActions: { bodySizeLimit: "9mb" },
  },
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  cacheComponents: true,
  // Images are resized once at upload (sharp); the server never resizes per request (1 CPU).
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          ...(process.env.SITE_NOINDEX === "1" ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : []),
        ],
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
