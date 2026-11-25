import { Router } from "express";
import * as auth from "../controllers/auth.controller.js";
import * as users from "../controllers/user.controller.js";
import { loginSchema } from "../dto/auth.dto.js";
import { validate } from "../middlewares/validation.middleware.js";
import { requireAuthenticated } from "../middlewares/roles.middleware.js";
import { requireCsrf } from "../services/auth.service.js";
import {
  loginLimiter,
  requireJson,
} from "../middlewares/security.middleware.js";
import { asyncRoute } from "../utils/errors.js";
import assure from "./assure.routes.js";
import contrat from "./contrat.routes.js";
import echeance from "./echeance.routes.js";
import dossier from "./dossier.routes.js";
import paiement from "./paiement.routes.js";
import relance from "./relance.routes.js";
import user from "./user.routes.js";
import audit from "./audit.routes.js";
import dashboard from "./dashboard.routes.js";

export function createRouter() {
  const router = Router();

  router.get("/health", asyncRoute(auth.health));
  router.get("/demo-info", asyncRoute(users.demo));

  router.post(
    "/auth/login",
    loginLimiter(),
    requireJson,
    validate({ body: loginSchema }),
    asyncRoute(auth.login),
  );

  router.use(requireAuthenticated);
  router.get("/auth/me", asyncRoute(auth.me));
  router.post("/auth/logout", requireCsrf, asyncRoute(auth.logout));
  router.get("/agents", asyncRoute(users.agents));

  router.use("/insureds", assure);
  router.use("/contracts", contrat);
  router.use("/installments", echeance);
  router.use("/cases", dossier);
  router.use("/payments", paiement);
  router.use("/reminders", relance);
  router.use("/users", user);
  router.use("/audit", audit);
  router.use("/dashboard", dashboard);

  return router;
}
