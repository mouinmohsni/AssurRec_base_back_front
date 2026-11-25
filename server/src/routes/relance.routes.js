import { Router } from "express";
import * as controller from "../controllers/relance.controller.js";
import * as dto from "../dto/relance.dto.js";
import { idParams } from "../dto/common.dto.js";
import { validate } from "../middlewares/validation.middleware.js";
import { requireRole } from "../middlewares/roles.middleware.js";
import { requireCsrf } from "../services/auth.service.js";
import { requireJson } from "../middlewares/security.middleware.js";
import { asyncRoute } from "../utils/errors.js";
const router = Router();
router.get(
  "/",
  validate({ query: dto.reminderQuery }),
  asyncRoute(controller.list),
);
router.get("/:id", validate({ params: idParams }), asyncRoute(controller.get));
router.post(
  "/",
  requireCsrf,
  requireJson,
  validate({ body: dto.reminderSchema }),
  asyncRoute(controller.create),
);
router.put(
  "/:id",
  requireCsrf,
  requireJson,
  validate({ params: idParams, body: dto.reminderSchema }),
  asyncRoute(controller.update),
);
router.delete(
  "/:id",
  requireCsrf,
  validate({ params: idParams }),
  asyncRoute(controller.remove),
);
export default router;
