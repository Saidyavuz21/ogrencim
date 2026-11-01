import path from "path";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config: any) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "lucide-react": path.resolve(process.cwd(), "src/components/icons.tsx"),
    };
    return config;
  },
};

export default nextConfig;
