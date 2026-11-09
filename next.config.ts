import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Geliştirme sırasında sol alttaki "N" göstergesi sohbet kutusunun üstüne biniyordu.
  // Derleme/çalışma hataları yine ekranın ortasında gösterilir.
  devIndicators: false,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "lucide-react": path.resolve(process.cwd(), "src/components/icons.tsx"),
    };
    return config;
  },
};

export default nextConfig;
