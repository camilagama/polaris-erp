import type { NextConfig } from "next";

const TRAILING_SLASH_PATTERN = /\/$/;

const imageRemotePatterns = (() => {
  const remoteUrls = [
    process.env.R2_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter((value): value is string => Boolean(value));

  return remoteUrls.map(
    (value) => new URL(`${value.replace(TRAILING_SLASH_PATTERN, "")}/**`)
  );
})();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: imageRemotePatterns,
  },
  reactStrictMode: true,
  reactCompiler: true,
};

export default nextConfig;
