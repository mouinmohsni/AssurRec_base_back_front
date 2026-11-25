import { withTransaction } from "../config/database.js";
import { todayUtc } from "../config/index.js";
import { forbidden, requireActorRole } from "../utils/errors.js";
import { pagination, pageResult } from "../utils/pagination.js";
import {
  assertCaseTransition,
  applyFinancialRule,
} from "../domain/recouvrement.js";
import { toCaseDto, toAuditDto } from "../dto/dossier.mapper.js";
import { toPaymentDto } from "../dto/paiement.mapper.js";
import { toReminderDto } from "../dto/relance.mapper.js";
import { toInsuredDto } from "../dto/assure.mapper.js";
import { toContractDto } from "../dto/contrat.mapper.js";
import { toInstallmentDto } from "../dto/echeance.mapper.js";
import * as repository from "../repositories/dossier.repository.js";
import { currentBalanceMilli } from "../repositories/finance.repository.js";

function inputPage(q = {}) {
  return { ...q, ...pagination(q) };
}

export async function listCases(q = {}, actor) {
  const query = inputPage(q);
  const result = await repository.listCases(query, actor);
  return pageResult(result.rows.map(toCaseDto), result.count, q);
}

export async function getCase(id, actor, transaction) {
  return toCaseDto(await repository.getCaseById(id, actor, transaction));
}

export async function saveCase(actor, id, input) {
  if (id == null) requireActorRole(actor, "admin", "manager", "agent");
  else requireActorRole(actor, "admin", "manager", "agent");
  return withTransaction(async (transaction) => {
    if (id == null) {
      requireActorRole(actor, "admin", "manager");
      return toCaseDto(await repository.createCase(input, actor, transaction));
    }
    if (actor.role === "agent" && input.agentId !== undefined)
      forbidden("Un agent ne peut pas réaffecter un dossier.");
    return toCaseDto(
      await repository.updateCase(id, actor, input, transaction),
    );
  });
}

export async function updateCaseTransition(actor, id, input) {
  requireActorRole(actor, "admin", "manager", "agent");
  return withTransaction(async (transaction) => {
    const locked = await repository.lockCaseForMutation(id, actor, transaction);
    const balanceMilli = await currentBalanceMilli(
      locked.installment,
      transaction,
      true,
    );
    applyFinancialRule(() =>
      assertCaseTransition(
        locked.recoveryCase.status,
        input.status,
        actor.role,
        balanceMilli,
        input.promiseDate,
        todayUtc(),
      ),
    );
    return toCaseDto(
      await repository.transitionCase(
        id,
        actor,
        input.status,
        input.promiseDate,
        transaction,
      ),
    );
  });
}

export async function deleteCase(actor, id) {
  requireActorRole(actor, "admin", "manager", "agent");
  return withTransaction(async (transaction) => {
    await repository.deleteCase(id, actor, transaction);
    return { ok: true };
  });
}

export async function caseDetail(actor, id) {
  requireActorRole(actor, "admin", "manager", "agent");
  const detail = await repository.getCaseDetail(id, actor);
  const installment = detail.installment;
  const paidMilli = Number(detail.recoveryCase.get("paidMilli") ?? 0);
  return {
    case: toCaseDto(detail.recoveryCase),
    insured: toInsuredDto(detail.insured),
    contract: toContractDto(detail.contract),
    installment: toInstallmentDto(installment, paidMilli),
    payments: detail.payments.map(toPaymentDto),
    reminders: detail.reminders.map(toReminderDto),
    audit: detail.audit.map(toAuditDto),
  };
}
