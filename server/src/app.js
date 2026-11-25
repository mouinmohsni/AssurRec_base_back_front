import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import { config } from "./config/index.js";
import { loadSession } from "./services/auth.service.js";
import { createRouter } from "./routes/index.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { HttpError } from "./utils/errors.js";

/** Fabrique indépendante du réseau : pas de listen, migration, seed ou sync. */
export function createApiApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      crossOriginEmbedderPolicy: false,
    }),
  );


  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes(origin))
          return callback(null, true);
        callback(
          new HttpError(403, "ORIGIN_FORBIDDEN", "Origine non autorisée."),
        );
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    }),
  );
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(loadSession);
  app.use("/api", createRouter());

  app.use("/api", (_req, res) =>
    res
      .status(404)
      .json({
        error: { code: "NOT_FOUND", message: "Route API introuvable." },
      }),
  );
  app.use(errorHandler);
  return app;
}
