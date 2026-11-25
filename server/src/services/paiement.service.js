import { withTransaction } from "../config/database.js";
import { badRequest, requireActorRole } from "../utils/errors.js";
import { pagination, pageResult } from "../utils/pagination.js";
import {
  applyFinancialRule,
  validateAmountMilli,
} from "../domain/recouvrement.js";
import { toPaymentDto } from "../dto/paiement.mapper.js";
import * as repository from "../repositories/paiement.repository.js";

function inputPage(q = {}) {
  return { ...q, ...pagination(q) };
}

export async function listPayments(q = {}, actor) {
  const query = inputPage(q);
  const result = await repository.listPayments(query, actor);
  return pageResult(result.rows.map(toPaymentDto), result.count, q);
}

export async function getPayment(id, actor, transaction) {
  return toPaymentDto(await repository.getPaymentById(id, actor, transaction));
}

export async function createPayment(actor, input) {
  requireActorRole(actor, "admin", "manager", "agent");
  const amountMilli = applyFinancialRule(() =>
    validateAmountMilli(Number(input.amountMilli)),
  );
  return withTransaction(async (transaction) =>
    toPaymentDto(
      await repository.createPayment(
        { ...input, amountMilli },
        actor,
        transaction,
      ),
    ),
  );
}

export async function reversePayment(actor, id, reason) {
  requireActorRole(actor, "admin", "manager");
  const normalizedReason = String(reason ?? "").trim();
  if (!normalizedReason) badRequest("Le motif d’annulation est requis.");
  return withTransaction(async (transaction) =>
    toPaymentDto(
      await repository.reversePayment(id, normalizedReason, actor, transaction),
    ),
  );
}
