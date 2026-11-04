import path from "path";

const nextConfig = {
  // Geliştirme sırasında sol alttaki "N" göstergesi sohbet kutusunun üstüne biniyordu.
  // Derleme/çalışma hataları yine ekranın ortasında gösterilir.
  devIndicators: false,
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
