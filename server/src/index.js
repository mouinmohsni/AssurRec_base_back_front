import express from "express";
import fs from "node:fs";
import path from "node:path";
import { createApiApp } from "./app.js";
import { config } from "./config/index.js";
import { closeDatabase } from "./config/database.js";

const app = createApiApp();
if (config.nodeEnv === "production" && config.frontendDist) {
  const publicDir = path.resolve(config.frontendDist);
  const indexFile = path.join(publicDir, "index.html");
  if (!fs.existsSync(indexFile))
    throw new Error(
      "FRONTEND_DIST doit désigner un frontend déjà compilé contenant index.html.",
    );
  app.get("/404", (_req, res) => res.status(404).sendFile(indexFile));
  app.use(express.static(publicDir));
  app.get("/{*page}", (_req, res) => res.sendFile(indexFile));
} else {
  app.get("/", (_req, res) =>
    res.json({
      application: "AssurRec API",
      version: "2.0.0",
      health: "/api/health",
    }),
  );
  app.use((_req, res) =>
    res
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "Page introuvable." } }),
  );
}
const server = app.listen(config.port, "0.0.0.0", () =>
  console.log(`[assurrec] API sur le port ${config.port}`),
);
function shutdown() {
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  server.closeIdleConnections();
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
