import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Ces variables configurent le serveur Vite, pas les secrets de la base.
  const env = loadEnv(mode, root, "");
  const allowedHosts = (
    process.env.PREVIEW_ALLOWED_HOSTS ||
    env.PREVIEW_ALLOWED_HOSTS ||
    ""
  )
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  const backend =
    process.env.API_PROXY_TARGET ||
    env.API_PROXY_TARGET ||
    "http://127.0.0.1:4000";

  return {
    root,
    plugins: [react()],
    publicDir: path.resolve(root, "public"),
    build: { outDir: path.resolve(root, "dist"), emptyOutDir: true },
    server: {
      port: 3000,
      strictPort: true,
      allowedHosts: ["localhost", "127.0.0.1", ...allowedHosts],
      // L'API reste côté serveur ; le navigateur appelle /api sur l'origine du client.
      proxy: { "/api": { target: backend, changeOrigin: false } },
    },
  };
});
