import * as svc from "../services/assure.service.js";
import { requireAuth } from "../utils/errors.js";

export async function list(req, res) {
  res.json(await svc.listInsureds(requireAuth(req), req.validated.query));
}
export async function get(req, res) {
  res.json(await svc.getInsured(req.validated.params.id, requireAuth(req)));
}
export async function create(req, res) {
  res
    .status(201)
    .json(
      await svc.saveInsured(requireAuth(req), undefined, req.validated.body),
    );
}
export async function update(req, res) {
  res.json(
    await svc.saveInsured(
      requireAuth(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );
}
export async function remove(req, res) {
  await svc.deleteInsured(requireAuth(req), req.validated.params.id);
  res.json({ ok: true });
}
