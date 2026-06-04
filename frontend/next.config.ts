import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const frontendDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Monorepo: lockfile na raiz faz o Next assumir o diretório errado.
  // Fixa a raiz do Turbopack na pasta do frontend (onde está app/).
  turbopack: {
    root: frontendDir,
  },
};

export default nextConfig;
