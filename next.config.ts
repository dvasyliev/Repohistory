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
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
