import * as svc from "../services/contrat.service.js";
import { requireAuth } from "../utils/errors.js";

export async function list(req, res) {
  res.json(await svc.listContracts(requireAuth(req), req.validated.query));
}


export async function get(req, res) {
  res.json(await svc.getContract(req.validated.params.id, requireAuth(req)));
}


export async function create(req, res) {
  res
    .status(201)
    .json(
      await svc.saveContract(requireAuth(req), undefined, req.validated.body),
    );
}


export async function update(req, res) {
  res.json(
    await svc.saveContract(
      requireAuth(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );
}


export async function remove(req, res) {
  await svc.deleteContract(requireAuth(req), req.validated.params.id);
  res.json({ ok: true });
}
