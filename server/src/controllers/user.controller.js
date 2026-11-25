import * as svc from "../services/user.service.js";
import { requireAuth } from "../utils/errors.js";

export async function list(req, res) {
  res.json(await svc.listUsers(req.validated.query, requireAuth(req)));
}

export async function create(req, res) {
  res
    .status(201)
    .json(await svc.saveUser(requireAuth(req), undefined, req.validated.body));
}

export async function update(req, res) {
  res.json(
    await svc.saveUser(
      requireAuth(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );
}

export async function remove(req, res) {
  await svc.deactivateUser(requireAuth(req), req.validated.params.id);
  res.json({ ok: true });
}

export async function agents(req, res) {
  res.json(await svc.listAgents(requireAuth(req)));
}

export async function demo(req, res) {
  res.json(await svc.demoInfo());
}
