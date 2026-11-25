import * as svc from "../services/audit.service.js";
import { requireAuth } from "../utils/errors.js";

export async function list(req, res) {
  res.json(await svc.auditList(req.validated.query));
}
