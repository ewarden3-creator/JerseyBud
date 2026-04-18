import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-leaflet ships ESM that Next's bundler can't pre-process — must transpile
  transpilePackages: ["react-leaflet", "@react-leaflet/core", "leaflet"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.dutchie.com" },
      { protocol: "https", hostname: "**.iheartjane.com" },
      { protocol: "https", hostname: "images.dutchie.com" },
    ],
  },
};

export default nextConfig;
