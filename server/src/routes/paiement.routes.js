import { Router } from "express";
import * as controller from "../controllers/paiement.controller.js";
import * as dto from "../dto/paiement.dto.js";
import { idParams } from "../dto/common.dto.js";
import { validate } from "../middlewares/validation.middleware.js";
import { requireRole } from "../middlewares/roles.middleware.js";
import { requireCsrf } from "../services/auth.service.js";
import { requireJson } from "../middlewares/security.middleware.js";
import { asyncRoute } from "../utils/errors.js";
const router = Router();

router.get(
  "/",
  validate({ query: dto.paymentQuery }),
  asyncRoute(controller.list),
);
router.get("/:id", validate({ params: idParams }), asyncRoute(controller.get));
router.post(
  "/",
  requireCsrf,
  requireJson,
  validate({ body: dto.paymentSchema }),
  asyncRoute(controller.create),
);
router.post(
  "/:id/reverse",
  requireRole("admin", "manager"),
  requireCsrf,
  requireJson,
  validate({ params: idParams, body: dto.reverseSchema }),
  asyncRoute(controller.reverse),
);
export default router;
