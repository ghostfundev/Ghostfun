import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `pg` requires `pg-cloudflare` behind a runtime check, so Next's file tracer
  // cannot see it statically and only copies the non-workerd stub. The OpenNext
  // esbuild pass runs with the workerd condition and then fails to resolve it.
  // Forcing these files into the trace fixes the Cloudflare Worker build.
  // https://github.com/opennextjs/opennextjs-cloudflare/issues/1214
  outputFileTracingIncludes: {
    "**/*": ["./node_modules/pg-cloudflare/dist/**", "./node_modules/pg-cloudflare/esm/**"],
  },
};

// Lets `next dev` talk to Cloudflare bindings defined in wrangler.jsonc.
// Guarded so a missing/broken adapter can never break a production build.
if (process.env.NODE_ENV === "development") {
  import("@opennextjs/cloudflare")
    .then(({ initOpenNextCloudflareForDev }) => initOpenNextCloudflareForDev())
    .catch(() => {});
}

export default nextConfig;
