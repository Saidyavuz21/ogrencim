import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Geliştirme sırasında sol alttaki "N" göstergesi sohbet kutusunun üstüne biniyordu.
  // Derleme/çalışma hataları yine ekranın ortasında gösterilir.
  devIndicators: false,
  poweredByHeader: false,
  // Güvenlik başlıkları (docs/GUVENLIK.md). Tam CSP (script-src vb.) yok: satır içi
  // betikleri kırmamak için yalnızca çerçeveleme, base ve form hedefleri kısıtlanır.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), payment=(), usb=(), microphone=(self), fullscreen=(self)",
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "lucide-react": path.resolve(process.cwd(), "src/components/icons.tsx"),
    };
    return config;
  },
};

export default nextConfig;
