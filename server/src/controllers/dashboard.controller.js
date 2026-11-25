import * as svc from "../services/dashboard.service.js";
import { requireAuth } from "../utils/errors.js";

export async function list(req, res) {
  res.json(await svc.dashboard(requireAuth(req), req.validated.query));
}
