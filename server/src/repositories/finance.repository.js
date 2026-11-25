import { Op, fn, col, Transaction } from "sequelize";
import { sequelize } from "../config/database.js";
import { Dossier, Echeance, Paiement, Utilisateur } from "../models/index.js";
import { notFound, conflict } from "../utils/errors.js";
import {
  calculateBalanceMilli,
  applyFinancialRule,
} from "../domain/recouvrement.js";

export const lock = (transaction) => ({
  transaction,
  lock: transaction ? Transaction.LOCK.UPDATE : undefined,
});
export const txOptions = (transaction) => (transaction ? { transaction } : {});

export function asNumber(value) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}
export function asDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}
export function isAgent(actor) {
  return actor?.role === "agent";
}
export function scopedAgentWhere(actor) {
  return isAgent(actor) ? { agentId: actor.id } : {};
}

export function caseGraphInclude() {
  return [
    {
      model: Echeance,
      as: "installment",
      include: [
        { association: "contract", include: [{ association: "insured" }] },
      ],
    },
    { model: Utilisateur, as: "agent", required: false },
  ];
}

export async function findInstallmentLocked(installmentId, transaction) {
  const installment = await Echeance.findByPk(installmentId, {
    ...lock(transaction),
  });
  if (!installment) notFound("Échéance introuvable");
  return installment;
}

/** Locks the installment first, then the case row, preserving the financial lock order. */
export async function findCaseLocked(caseId, actor, transaction) {
  const metadata = await Dossier.findByPk(caseId, {
    attributes: ["id", "installmentId", "agentId"],
    ...txOptions(transaction),
  });
  if (
    !metadata ||
    (isAgent(actor) && asNumber(metadata.agentId) !== asNumber(actor.id))
  ) {
    notFound("Dossier introuvable");
  }
  const installment = await findInstallmentLocked(
    asNumber(metadata.installmentId),
    transaction,
  );
  const recoveryCase = await Dossier.findByPk(caseId, {
    include: caseGraphInclude(),
    ...lock(transaction),
  });
  if (
    !recoveryCase ||
    (isAgent(actor) && asNumber(recoveryCase.agentId) !== asNumber(actor.id))
  )
    notFound("Dossier introuvable");
  return { recoveryCase, installment };
}

export async function findActiveCaseLocked(installmentId, transaction) {
  return Dossier.findOne({
    where: { installmentId, status: { [Op.ne]: "cloture" } },
    order: [["id", "ASC"]],
    ...lock(transaction),
  });
}

/** Reads every valid payment in deterministic id order, locking rows after the parent locks. */
export async function validPaymentsForInstallment(
  installmentId,
  transaction,
  shouldLock = true,
) {
  return Paiement.findAll({
    where: { installmentId, status: "valide" },
    attributes: ["id", "amountMilli"],
    order: [["id", "ASC"]],
    ...(shouldLock ? lock(transaction) : txOptions(transaction)),
  });
}

export async function currentBalanceMilli(
  installment,
  transaction,
  shouldLock = true,
) {
  const payments = await validPaymentsForInstallment(
    asNumber(installment.id),
    transaction,
    shouldLock,
  );
  const paidMilli = payments.reduce(
    (sum, payment) => sum + asNumber(payment.amountMilli),
    0,
  );
  return applyFinancialRule(() =>
    calculateBalanceMilli(asNumber(installment.amountMilli), paidMilli),
  );
}

export async function attachBalance(
  recoveryCase,
  transaction,
  shouldLock = false,
) {
  const installment =
    recoveryCase.installment ??
    (await Echeance.findByPk(
      recoveryCase.installmentId,
      txOptions(transaction),
    ));
  const balanceMilli = await currentBalanceMilli(
    installment,
    transaction,
    shouldLock,
  );
  recoveryCase.setDataValue("amountMilli", asNumber(installment.amountMilli));
  recoveryCase.setDataValue(
    "paidMilli",
    asNumber(installment.amountMilli) - balanceMilli,
  );
  recoveryCase.setDataValue("balanceMilli", balanceMilli);
  recoveryCase.setDataValue("dueDate", installment.dueDate);
  return recoveryCase;
}

export async function assertActiveAgent(agentId, transaction) {
  if (agentId == null) return null;
  const agent = await Utilisateur.findOne({
    where: { id: agentId, role: "agent", active: true },
    ...lock(transaction),
  });
  if (!agent) conflict("L’agent doit être actif et avoir le rôle agent.");
  return agent;
}

export async function assertVisibleCase(actor, caseId, transaction) {
  return findCaseLocked(caseId, actor, transaction);
}

export async function aggregatePaidMilli(installmentIds, transaction) {
  if (!installmentIds.length) return new Map();
  const rows = await Paiement.findAll({
    attributes: [
      "installmentId",
      [fn("SUM", col("amount_milli")), "paidMilli"],
    ],
    where: { installmentId: { [Op.in]: installmentIds }, status: "valide" },
    group: ["installment_id"],
    ...txOptions(transaction),
  });
  return new Map(
    rows.map((row) => [
      asNumber(row.installmentId),
      asNumber(row.get("paidMilli")),
    ]),
  );
}

export async function assertPaymentCaseScope(
  actor,
  installmentId,
  transaction,
) {
  const activeCase = await findActiveCaseLocked(installmentId, transaction);
  if (
    isAgent(actor) &&
    (!activeCase || asNumber(activeCase.agentId) !== asNumber(actor.id))
  ) {
    notFound("Échéance introuvable");
  }
  return activeCase;
}

export async function findTypedCaseAudit(
  caseId,
  paymentIds,
  reminderIds,
  transaction,
) {
  const { AuditEvent } = await import("../models/index.js");
  const clauses = [{ entityType: "case", entityId: caseId }];
  if (paymentIds.length)
    clauses.push({ entityType: "payment", entityId: { [Op.in]: paymentIds } });
  if (reminderIds.length)
    clauses.push({
      entityType: "reminder",
      entityId: { [Op.in]: reminderIds },
    });
  return AuditEvent.findAll({
    where: { [Op.or]: clauses },
    include: [{ model: Utilisateur, as: "actor", required: false }],
    order: [["id", "DESC"]],
    ...txOptions(transaction),
  });
}

export function transactionOrDefault(transaction) {
  return transaction ? { transaction } : {};
}

export { sequelize };
