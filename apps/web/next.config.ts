import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Static export is for Netlify production builds. In dev we want the
    // normal server so dynamic routes like /vendor/[handle] work without
    // requiring every handle in generateStaticParams.
    ...(process.env.NODE_ENV === "production" ? { output: "export" as const } : {}),
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
