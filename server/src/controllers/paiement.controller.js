import * as svc from "../services/paiement.service.js";
import { requireAuth } from "../utils/errors.js";

export async function list(req, res) {
  res.json(await svc.listPayments(req.validated.query, requireAuth(req)));
}

export async function get(req, res) {
  res.json(await svc.getPayment(req.validated.params.id, requireAuth(req)));
}

export async function create(req, res) {
  res
    .status(201)
    .json(await svc.createPayment(requireAuth(req), req.validated.body));
}

export async function reverse(req, res) {
  res.json(
    await svc.reversePayment(
      requireAuth(req),
      req.validated.params.id,
      req.validated.body.reason,
    ),
  );
}
