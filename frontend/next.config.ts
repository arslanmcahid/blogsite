import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // Docker'da küçük, bağımsız bir imaj üretmek için.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Django URL'leri "/" ile biter (/api/posts/). Next'in sondaki "/" silen
  // yönlendirmesi bunları bozar ve sonsuz yönlendirmeye yol açar.
  skipTrailingSlashRedirect: true,
  // Tarayıcı hep aynı origin'e (/api, /media) istek atar. Geliştirmede bunları
  // Django'ya yönlendiririz; production'da aynı işi Nginx yapacak.
  // Not: rewrites build sırasında sabitlenir, Docker build'inde API_URL verilmeli.
  async rewrites() {
    return [
      // Django URL'leri "/" ile biter; slash'lı ve slash'sız iki kural gerekiyor.
      { source: "/api/:path*/", destination: `${API_URL}/api/:path*/` },
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/media/:path*", destination: `${API_URL}/media/:path*` },
    ];
  },
};

export default nextConfig;
