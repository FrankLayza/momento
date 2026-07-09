/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 14
  // Strict mode enabled for React
  reactStrictMode: true,

  // Allow @vercel/og image generation
  experimental: {
    serverComponentsExternalPackages: [
      "@metaplex-foundation/umi",
      "@metaplex-foundation/mpl-bubblegum",
      "@solana/web3.js",
    ],
  },
};

export default nextConfig;
