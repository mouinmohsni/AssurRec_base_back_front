import { Router } from "express";
import * as controller from "../controllers/dossier.controller.js";
import * as dto from "../dto/dossier.dto.js";
import { idParams } from "../dto/common.dto.js";
import { validate } from "../middlewares/validation.middleware.js";
import { requireRole } from "../middlewares/roles.middleware.js";
import { requireCsrf } from "../services/auth.service.js";
import { requireJson } from "../middlewares/security.middleware.js";
import { asyncRoute } from "../utils/errors.js";
const router = Router();
router.get(
  "/",
  validate({ query: dto.caseQuery }),
  asyncRoute(controller.list),
);
router.get("/:id", validate({ params: idParams }), asyncRoute(controller.get));
router.post(
  "/",
  requireRole("admin", "manager"),
  requireCsrf,
  requireJson,
  validate({ body: dto.caseCreateSchema }),
  asyncRoute(controller.create),
);
router.put(
  "/:id",
  requireCsrf,
  requireJson,
  validate({ params: idParams, body: dto.caseUpdateSchema }),
  asyncRoute(controller.update),
);
router.delete(
  "/:id",
  requireCsrf,
  validate({ params: idParams }),
  asyncRoute(controller.remove),
);
router.get(
  "/:id/detail",
  validate({ params: idParams }),
  asyncRoute(controller.detail),
);
router.post(
  "/:id/transition",
  requireCsrf,
  requireJson,
  validate({ params: idParams, body: dto.transitionSchema }),
  asyncRoute(controller.transition),
);
export default router;
