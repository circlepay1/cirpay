import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  serverExternalPackages: [
    '@walletconnect/sign-client',
    '@walletconnect/core',
    '@walletconnect/utils',
    '@web3modal/wagmi',
  ],
};

export default nextConfig;
