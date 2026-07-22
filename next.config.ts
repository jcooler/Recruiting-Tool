import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mongoose", "bcrypt", "pdf-parse", "mammoth"],
};

export default nextConfig;
