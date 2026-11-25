import * as svc from "../services/relance.service.js";
import { requireAuth } from "../utils/errors.js";

export async function list(req, res) {
  res.json(await svc.listReminders(req.validated.query, requireAuth(req)));
}

export async function get(req, res) {
  res.json(await svc.getReminder(req.validated.params.id, requireAuth(req)));
}

export async function create(req, res) {
  res
    .status(201)
    .json(
      await svc.saveReminder(requireAuth(req), undefined, req.validated.body),
    );
}

export async function update(req, res) {
  res.json(
    await svc.saveReminder(
      requireAuth(req),
      req.validated.params.id,
      req.validated.body,
    ),
  );
}

export async function remove(req, res) {
  await svc.deleteReminder(requireAuth(req), req.validated.params.id);
  res.json({ ok: true });
}
