import * as svc from "../services/dossier.service.js";
import { requireAuth } from "../utils/errors.js";

export async function list(req, res) {
  res.json(await svc.listCases(req.validated.query, requireAuth(req)));
}

export async function get(req, res) {
  res.json(await svc.getCase(req.validated.params.id, requireAuth(req)));
}

export async function create(req, res) {
  res
    .status(201)
    .json(await svc.saveCase(requireAuth(req), undefined, req.validated.body));
}

export async function update(req, res) {
  res.json(
    await svc.saveCase(
      requireAuth(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );
}

export async function remove(req, res) {
  await svc.deleteCase(requireAuth(req), req.validated.params.id);
  res.json({ ok: true });
}

export async function detail(req, res) {
  res.json(await svc.caseDetail(requireAuth(req), req.validated.params.id));
}
export async function transition(req, res) {
  res.json(
    await svc.updateCaseTransition(
      requireAuth(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );
}
