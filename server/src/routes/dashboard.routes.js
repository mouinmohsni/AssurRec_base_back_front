import { Router } from "express";
import * as controller from "../controllers/dashboard.controller.js";
import * as dto from "../dto/dashboard.dto.js";
import { idParams } from "../dto/common.dto.js";
import { validate } from "../middlewares/validation.middleware.js";
import { requireRole } from "../middlewares/roles.middleware.js";
import { requireCsrf } from "../services/auth.service.js";
import { requireJson } from "../middlewares/security.middleware.js";
import { asyncRoute } from "../utils/errors.js";
const router = Router();
router.get(
  "/",
  validate({ query: dto.dashboardQuery }),
  asyncRoute(controller.list),
);
export default router;
