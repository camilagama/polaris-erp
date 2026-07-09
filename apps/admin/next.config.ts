import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

loadEnvConfig("../..");

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    authInterrupts: true,
  },
  reactCompiler: true,
  reactStrictMode: true,
};

export default nextConfig;
