import { Router } from "express";
import * as controller from "../controllers/user.controller.js";
import * as dto from "../dto/user.dto.js";
import { idParams } from "../dto/common.dto.js";
import { validate } from "../middlewares/validation.middleware.js";
import { requireRole } from "../middlewares/roles.middleware.js";
import { requireCsrf } from "../services/auth.service.js";
import { requireJson } from "../middlewares/security.middleware.js";
import { asyncRoute } from "../utils/errors.js";
const router = Router();

router.use(requireRole("admin"));
router.get(
  "/",
  validate({ query: dto.userQuery }),
  asyncRoute(controller.list),
);
router.post(
  "/",
  requireCsrf,
  requireJson,
  validate({ body: dto.userCreateSchema }),
  asyncRoute(controller.create),
);
router.put(
  "/:id",
  requireCsrf,
  requireJson,
  validate({ params: idParams, body: dto.userUpdateSchema }),
  asyncRoute(controller.update),
);
router.delete(
  "/:id",
  requireCsrf,
  validate({ params: idParams }),
  asyncRoute(controller.remove),
);
export default router;
