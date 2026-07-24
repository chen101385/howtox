/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Allow remote hero/asset images referenced from client configs.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
