import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  redirects() {
    return Promise.resolve([
      {
        source: "/login",
        destination: "/signin",
        permanent: true,
      },
    ]);
  },
  images: {
    dangerouslyAllowSVG: true,
    // Workers have no Next image optimizer without a paid Images binding.
    unoptimized: true,
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;

// The Cloudflare bindings proxy keeps the process alive, so only `next dev` starts it.
if (process.argv.includes("dev")) {
  void initOpenNextCloudflareForDev();
}
