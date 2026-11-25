import * as svc from "../services/echeance.service.js";
import { requireAuth } from "../utils/errors.js";

export async function list(req, res) {
  res.json(await svc.listInstallments(requireAuth(req), req.validated.query));
}


export async function get(req, res) {
  res.json(await svc.getInstallment(req.validated.params.id, requireAuth(req)));
}


export async function create(req, res) {
  res
    .status(201)
    .json(
      await svc.saveInstallment(
        requireAuth(req),
        undefined,
        req.validated.body,
      ),
    );
}


export async function update(req, res) {
  res.json(
    await svc.saveInstallment(
      requireAuth(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );
}


export async function remove(req, res) {
  await svc.deleteInstallment(requireAuth(req), req.validated.params.id);
  res.json({ ok: true });
}
