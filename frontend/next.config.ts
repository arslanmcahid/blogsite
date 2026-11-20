import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker'da küçük, bağımsız bir imaj üretmek için.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
};

export default nextConfig;
