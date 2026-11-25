import { Op } from "sequelize";
import {
  Paiement,
  Echeance,
  Contrat,
  Assure,
  Dossier,
  Utilisateur,
} from "../models/index.js";
import { audit } from "./audit.repository.js";
import { notFound, conflict } from "../utils/errors.js";
import {
  asNumber,
  currentBalanceMilli,
  findActiveCaseLocked,
  findCaseLocked,
  findInstallmentLocked,
  isAgent,
  txOptions,
  lock,
} from "./finance.repository.js";

function paymentIncludes({ caseRequired = false } = {}) {
  return [
    {
      model: Echeance,
      as: "installment",
      include: [
        {
          model: Contrat,
          as: "contract",
          include: [{ model: Assure, as: "insured" }],
        },
      ],
    },
    { model: Dossier, as: "case", required: caseRequired },
    { model: Utilisateur, as: "recordedByUser" },
  ];
}

function listWhere(q) {
  const where = {};
  if (q.installmentId) where.installmentId = q.installmentId;
  if (q.caseId) where.caseId = q.caseId;
  if (q.from || q.to) {
    where.paidAt = {};
    if (q.from) where.paidAt[Op.gte] = q.from;
    if (q.to) where.paidAt[Op.lte] = q.to;
  }
  if (q.status) where.status = q.status;
  if (q.search)
    where[Op.or] = [
      { reference: { [Op.like]: `%${q.search}%` } },
      { "$installment.contract.insured.name$": { [Op.like]: `%${q.search}%` } },
    ];
  return where;
}

export async function listPayments(q, actor) {
  const include = paymentIncludes({ caseRequired: isAgent(actor) });
  if (isAgent(actor))
    include.find((item) => item.as === "case").where = { agentId: actor.id };
  return Paiement.findAndCountAll({
    where: listWhere(q),
    include,
    distinct: true,
    order: [["id", "DESC"]],
    limit: q.limit,
    offset: q.offset,
  });
}

export async function getPaymentById(paymentId, actor, transaction) {
  const include = paymentIncludes({ caseRequired: isAgent(actor) });
  if (isAgent(actor))
    include.find((item) => item.as === "case").where = { agentId: actor.id };
  const payment = await Paiement.findOne({
    where: { id: paymentId },
    include,
    ...txOptions(transaction),
  });
  if (!payment) notFound("Paiement introuvable");
  return payment;
}

export async function createPayment(
  { installmentId, amountMilli, paidAt, method, reference },
  actor,
  transaction,
) {
  const installment = await findInstallmentLocked(installmentId, transaction);
  const activeCase = await findActiveCaseLocked(installmentId, transaction);
  if (
    isAgent(actor) &&
    (!activeCase || asNumber(activeCase.agentId) !== asNumber(actor.id))
  ) {
    notFound("Échéance introuvable");
  }
  const balanceMilli = await currentBalanceMilli(
    installment,
    transaction,
    true,
  );
  if (amountMilli > balanceMilli)
    conflict("Le paiement ne peut pas dépasser le solde dû.");
  const payment = await Paiement.create(
    {
      reference,
      installmentId,
      caseId: activeCase?.id ?? null,
      amountMilli,
      paidAt,
      method,
      status: "valide",
      recordedBy: actor.id,
    },
    txOptions(transaction),
  );
  await audit(
    transaction,
    actor,
    "creation",
    "payment",
    payment.id,
    "Paiement enregistré",
  );
  return getPaymentById(payment.id, actor, transaction);
}

export async function reversePayment(paymentId, reason, actor, transaction) {
  const metadata = await Paiement.findByPk(paymentId, {
    attributes: ["id", "installmentId", "caseId"],
    ...txOptions(transaction),
  });
  if (!metadata) notFound("Paiement introuvable");
  const installment = await findInstallmentLocked(
    asNumber(metadata.installmentId),
    transaction,
  );
  const lockedCase =
    metadata.caseId == null
      ? null
      : await findCaseLocked(asNumber(metadata.caseId), actor, transaction);
  const payment = await Paiement.findByPk(paymentId, { ...lock(transaction) });
  if (!payment) notFound("Paiement introuvable");
  if (
    asNumber(payment.installmentId) !== asNumber(installment.id) ||
    (payment.caseId == null ? null : asNumber(payment.caseId)) !==
      (metadata.caseId == null ? null : asNumber(metadata.caseId))
  ) {
    conflict("Le paiement a été modifié pendant l’opération.");
  }
  if (payment.status === "annule") conflict("Ce paiement est déjà annulé.");
  await payment.update(
    { status: "annule", reversalReason: reason },
    txOptions(transaction),
  );
  const balanceMilli = await currentBalanceMilli(
    installment,
    transaction,
    true,
  );
  if (lockedCase?.recoveryCase?.status === "cloture" && balanceMilli > 0) {
    await lockedCase.recoveryCase.update(
      { status: "en_cours" },
      txOptions(transaction),
    );
    await audit(
      transaction,
      actor,
      "reouverture",
      "case",
      lockedCase.recoveryCase.id,
      "Réouverture automatique après annulation de paiement créant une dette",
    );
  }
  await audit(
    transaction,
    actor,
    "annulation",
    "payment",
    paymentId,
    `Paiement annulé: ${reason}`,
  );
  return getPaymentById(paymentId, actor, transaction);
}
