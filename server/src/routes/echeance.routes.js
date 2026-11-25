import { Router } from "express";
import * as controller from "../controllers/echeance.controller.js";
import * as dto from "../dto/echeance.dto.js";
import { idParams } from "../dto/common.dto.js";
import { validate } from "../middlewares/validation.middleware.js";
import { requireRole } from "../middlewares/roles.middleware.js";
import { requireCsrf } from "../services/auth.service.js";
import { requireJson } from "../middlewares/security.middleware.js";
import { asyncRoute } from "../utils/errors.js";
const router = Router();
router.get(
  "/",
  validate({ query: dto.installmentQuery }),
  asyncRoute(controller.list),
);
router.get("/:id", validate({ params: idParams }), asyncRoute(controller.get));
router.post(
  "/",
  requireRole("admin", "manager"),
  requireCsrf,
  requireJson,
  validate({ body: dto.installmentSchema }),
  asyncRoute(controller.create),
);
router.put(
  "/:id",
  requireRole("admin", "manager"),
  requireCsrf,
  requireJson,
  validate({ params: idParams, body: dto.installmentSchema }),
  asyncRoute(controller.update),
);
router.delete(
  "/:id",
  requireRole("admin", "manager"),
  requireCsrf,
  validate({ params: idParams }),
  asyncRoute(controller.remove),
);
export default router;
