import { Op } from "sequelize";
import { randomUUID } from "node:crypto";
import {
  Dossier,
  Echeance,
  Utilisateur,
  Contrat,
  Assure,
  Paiement,
  Relance,
} from "../models/index.js";
import { todayUtc } from "../config/index.js";
import { notFound, conflict } from "../utils/errors.js";
import { audit } from "./audit.repository.js";
import { toAuditDto } from "../dto/dossier.mapper.js";
import {
  asNumber,
  currentBalanceMilli,
  aggregatePaidMilli,
  assertActiveAgent,
  caseGraphInclude,
  findActiveCaseLocked,
  findCaseLocked,
  findInstallmentLocked,
  findTypedCaseAudit,
  isAgent,
  txOptions,
} from "./finance.repository.js";

function includeList() {
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
    { model: Utilisateur, as: "agent", required: false },
  ];
}

function whereForList(q, actor) {
  const where = {};
  if (isAgent(actor)) where.agentId = actor.id;
  if (q.status) where.status = q.status;
  if (q.agentId && !isAgent(actor)) where.agentId = q.agentId;
  if (q.priority) where.priority = q.priority;
  if (q.from || q.to) {
    where["$installment.due_date$"] = {};
    if (q.from) where["$installment.due_date$"][Op.gte] = q.from;
    if (q.to) where["$installment.due_date$"][Op.lte] = q.to;
  }
  if (q.insuranceType)
    where["$installment.contract.insurance_type$"] = q.insuranceType;
  if (q.search) {
    const like = { [Op.like]: `%${q.search}%` };
    where[Op.or] = [
      { reference: like },
      { "$installment.reference$": like },
      { "$installment.contract.insured.name$": like },
    ];
  }
  return where;
}

function addBalances(rows, paidByInstallment) {
  for (const row of rows) {
    const installment = row.installment ?? {};
    const amountMilli = asNumber(installment.amountMilli);
    const paidMilli = paidByInstallment.get(asNumber(installment.id)) ?? 0;
    row.setDataValue("amountMilli", amountMilli);
    row.setDataValue("paidMilli", paidMilli);
    row.setDataValue("balanceMilli", Math.max(0, amountMilli - paidMilli));
    row.setDataValue("dueDate", installment.dueDate);
    row.setDataValue("installmentReference", installment.reference);
    row.setDataValue(
      "insuredId",
      installment.contract?.insuredId ?? installment.contract?.insured?.id,
    );
    row.setDataValue("insuredName", installment.contract?.insured?.name);
    row.setDataValue("contractReference", installment.contract?.reference);
    row.setDataValue("insuranceType", installment.contract?.insuranceType);
  }
  return rows;
}

export async function listCases(q, actor) {
  const result = await Dossier.findAndCountAll({
    where: whereForList(q, actor),
    include: includeList(),
    distinct: true,
    order: [["id", "DESC"]],
    limit: q.limit,
    offset: q.offset,
  });
  const ids = result.rows.map((row) =>
    asNumber(row.installmentId ?? row.installment?.id),
  );
  const paid = await aggregatePaidMilli(ids);
  addBalances(result.rows, paid);
  return result;
}

export async function getCaseById(caseId, actor, transaction) {
  const where = { id: caseId };
  if (isAgent(actor)) where.agentId = actor.id;
  const recoveryCase = await Dossier.findOne({
    where,
    include: includeList(),
    ...txOptions(transaction),
  });
  if (!recoveryCase) notFound("Dossier introuvable");
  const paid = await aggregatePaidMilli(
    [asNumber(recoveryCase.installmentId)],
    transaction,
  );
  addBalances([recoveryCase], paid);
  return recoveryCase;
}

export async function lockCaseForMutation(caseId, actor, transaction) {
  const locked = await findCaseLocked(caseId, actor, transaction);
  const paidMilli =
    asNumber(locked.installment.amountMilli) -
    (await currentBalanceMilli(locked.installment, transaction, true));
  locked.recoveryCase.setDataValue("paidMilli", paidMilli);
  locked.recoveryCase.setDataValue(
    "amountMilli",
    asNumber(locked.installment.amountMilli),
  );
  locked.recoveryCase.setDataValue(
    "balanceMilli",
    asNumber(locked.installment.amountMilli) - paidMilli,
  );
  locked.recoveryCase.setDataValue("dueDate", locked.installment.dueDate);
  return locked;
}

export async function createCase(
  { installmentId, agentId, priority, notes },
  actor,
  transaction,
) {
  const installment = await findInstallmentLocked(installmentId, transaction);
  const activeCase = await findActiveCaseLocked(installmentId, transaction);
  if (activeCase) conflict("Un dossier actif existe déjà pour cette échéance.");
  const balanceMilli = await currentBalanceMilli(
    installment,
    transaction,
    true,
  );
  await assertActiveAgent(agentId, transaction);
  if (installment.dueDate >= todayUtc() || balanceMilli <= 0) {
    conflict("Un dossier exige une échéance dépassée avec un solde positif.");
  }
  const recoveryCase = await Dossier.create(
    {
      reference: `DOS-${Date.now()}-${randomUUID().slice(0, 8)}`,
      installmentId,
      agentId: agentId ?? null,
      status: "nouveau",
      priority,
      openedAt: todayUtc(),
      notes,
    },
    txOptions(transaction),
  );
  await audit(
    transaction,
    actor,
    "creation",
    "case",
    recoveryCase.id,
    "Dossier créé",
  );
  return getCaseById(recoveryCase.id, actor, transaction);
}

export async function updateCase(caseId, actor, changes, transaction) {
  const { recoveryCase } = await lockCaseForMutation(
    caseId,
    actor,
    transaction,
  );
  if (isAgent(actor) && asNumber(recoveryCase.agentId) !== asNumber(actor.id))
    notFound("Dossier introuvable");
  if (Object.prototype.hasOwnProperty.call(changes, "agentId")) {
    await assertActiveAgent(changes.agentId, transaction);
  }
  const values = {};
  for (const key of ["agentId", "priority", "notes"]) {
    if (changes[key] !== undefined) values[key] = changes[key];
  }
  await recoveryCase.update(values, txOptions(transaction));
  await audit(
    transaction,
    actor,
    "modification",
    "case",
    caseId,
    "Dossier modifié",
  );
  return getCaseById(caseId, actor, transaction);
}

export async function transitionCase(
  caseId,
  actor,
  nextStatus,
  promiseDate,
  transaction,
) {
  const { recoveryCase, installment } = await lockCaseForMutation(
    caseId,
    actor,
    transaction,
  );
  const previousStatus = recoveryCase.status;
  const balanceMilli = await currentBalanceMilli(
    installment,
    transaction,
    true,
  );
  await recoveryCase.update(
    {
      status: nextStatus,
      promiseDate: nextStatus === "promesse_paiement" ? promiseDate : null,
    },
    txOptions(transaction),
  );
  await audit(
    transaction,
    actor,
    "transition",
    "case",
    caseId,
    `Statut ${previousStatus} vers ${nextStatus}`,
  );
  recoveryCase.setDataValue("balanceMilli", balanceMilli);
  return getCaseById(caseId, actor, transaction);
}

export async function deleteCase(caseId, actor, transaction) {
  const { recoveryCase } = await lockCaseForMutation(
    caseId,
    actor,
    transaction,
  );
  if (recoveryCase.status !== "nouveau")
    conflict("Seul un dossier nouveau sans opération peut être supprimé.");
  const [paymentCount, reminderCount] = await Promise.all([
    Paiement.count({ where: { caseId }, ...txOptions(transaction) }),
    Relance.count({ where: { caseId }, ...txOptions(transaction) }),
  ]);
  if (paymentCount || reminderCount)
    conflict("Seul un dossier nouveau sans opération peut être supprimé.");
  await recoveryCase.destroy(txOptions(transaction));
  await audit(
    transaction,
    actor,
    "suppression",
    "case",
    caseId,
    "Dossier supprimé",
  );
}

export async function getCaseDetail(caseId, actor, transaction) {
  const recoveryCase = await getCaseById(caseId, actor, transaction);
  const installment = await Echeance.findByPk(recoveryCase.installmentId, {
    include: [
      {
        model: Contrat,
        as: "contract",
        include: [{ model: Assure, as: "insured" }],
      },
    ],
    ...txOptions(transaction),
  });
  if (!installment) notFound("Échéance introuvable");
  const contract = await Contrat.findByPk(installment.contractId, {
    include: [{ model: Assure, as: "insured" }],
    ...txOptions(transaction),
  });
  if (!contract) notFound("Contrat introuvable");
  const insured = await Assure.findByPk(
    contract.insuredId,
    txOptions(transaction),
  );
  if (!insured) notFound("Assuré introuvable");
  const [payments, reminders] = await Promise.all([
    Paiement.findAll({
      where: { caseId },
      include: [
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
        { model: Utilisateur, as: "recordedByUser" },
      ],
      order: [["id", "DESC"]],
      ...txOptions(transaction),
    }),
    Relance.findAll({
      where: { caseId },
      include: [
        { model: Dossier, as: "case", include: caseGraphInclude() },
        { model: Utilisateur, as: "createdByUser" },
      ],
      order: [["id", "DESC"]],
      ...txOptions(transaction),
    }),
  ]);
  const audits = await findTypedCaseAudit(
    caseId,
    payments.map((row) => asNumber(row.id)),
    reminders.map((row) => asNumber(row.id)),
    transaction,
  );
  return {
    recoveryCase,
    installment,
    contract,
    insured,
    payments,
    reminders,
    audit: audits.map(toAuditDto),
  };
}
