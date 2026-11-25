import { build as viteBuild } from "vite";
import { build as serverBuild } from "esbuild";

await viteBuild();
await serverBuild({
  entryPoints: ["server/index.ts"],
  outfile: "dist/server.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  sourcemap: true,
});
console.log("Frontend et serveur compilés.");
