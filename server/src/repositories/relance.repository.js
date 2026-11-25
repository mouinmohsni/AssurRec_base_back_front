import { Op } from "sequelize";
import {
  Relance,
  Dossier,
  Echeance,
  Contrat,
  Assure,
  Utilisateur,
} from "../models/index.js";
import { audit } from "./audit.repository.js";
import { notFound, conflict } from "../utils/errors.js";
import {
  findCaseLocked,
  isAgent,
  txOptions,
  lock,
} from "./finance.repository.js";

function reminderIncludes({ caseRequired = false } = {}) {
  return [
    {
      model: Dossier,
      as: "case",
      required: caseRequired,
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
      ],
    },
    { model: Utilisateur, as: "createdByUser" },
  ];
}

function listWhere(q) {
  const where = {};
  if (q.caseId) where.caseId = q.caseId;
  if (q.status) where.status = q.status;
  if (q.channel) where.channel = q.channel;
  if (q.search)
    where[Op.or] = [
      { subject: { [Op.like]: `%${q.search}%` } },
      {
        "$case.installment.contract.insured.name$": {
          [Op.like]: `%${q.search}%`,
        },
      },
    ];
  return where;
}

export async function listReminders(q, actor) {
  const include = reminderIncludes({ caseRequired: isAgent(actor) });
  if (isAgent(actor))
    include.find((item) => item.as === "case").where = { agentId: actor.id };
  return Relance.findAndCountAll({
    where: listWhere(q),
    include,
    distinct: true,
    order: [["id", "DESC"]],
    limit: q.limit,
    offset: q.offset,
  });
}

export async function getReminderById(reminderId, actor, transaction) {
  const include = reminderIncludes({ caseRequired: isAgent(actor) });
  if (isAgent(actor))
    include.find((item) => item.as === "case").where = { agentId: actor.id };
  const reminder = await Relance.findOne({
    where: { id: reminderId },
    include,
    ...txOptions(transaction),
  });
  if (!reminder) notFound("Relance introuvable");
  return reminder;
}

export async function createReminder(
  { caseId, channel, subject, content, status, scheduledDate },
  actor,
  transaction,
) {
  const { recoveryCase } = await findCaseLocked(caseId, actor, transaction);
  if (recoveryCase.status === "cloture")
    conflict("Un dossier clôturé ne reçoit plus de relance.");
  const reminder = await Relance.create(
    {
      caseId,
      channel,
      subject,
      content,
      status,
      scheduledDate: scheduledDate ?? null,
      createdBy: actor.id,
    },
    txOptions(transaction),
  );
  await audit(
    transaction,
    actor,
    "creation",
    "reminder",
    reminder.id,
    "Relance enregistrée (aucun envoi externe)",
  );
  return getReminderById(reminder.id, actor, transaction);
}

export async function updateReminder(reminderId, changes, actor, transaction) {
  const metadata = await Relance.findByPk(reminderId, {
    attributes: ["id", "caseId"],
    ...txOptions(transaction),
  });
  if (!metadata) notFound("Relance introuvable");
  const { recoveryCase } = await findCaseLocked(
    metadata.caseId,
    actor,
    transaction,
  );
  const reminder = await Relance.findByPk(reminderId, { ...lock(transaction) });
  if (!reminder || Number(reminder.caseId) !== Number(metadata.caseId))
    notFound("Relance introuvable");
  if (reminder.status === "consigne")
    conflict("Une relance consignée est immuable.");
  if (recoveryCase.status === "cloture")
    conflict("Un dossier clôturé ne reçoit plus de relance.");
  await reminder.update(
    {
      channel: changes.channel,
      subject: changes.subject,
      content: changes.content,
      status: changes.status,
      scheduledDate: changes.scheduledDate ?? null,
    },
    txOptions(transaction),
  );
  await audit(
    transaction,
    actor,
    "modification",
    "reminder",
    reminderId,
    "Relance modifiée",
  );
  return getReminderById(reminderId, actor, transaction);
}

export async function deleteReminder(reminderId, actor, transaction) {
  const metadata = await Relance.findByPk(reminderId, {
    attributes: ["id", "caseId"],
    ...txOptions(transaction),
  });
  if (!metadata) notFound("Relance introuvable");
  const { recoveryCase } = await findCaseLocked(
    metadata.caseId,
    actor,
    transaction,
  );
  if (recoveryCase.status === "cloture")
    conflict("Un dossier clôturé ne permet plus de modifier ses relances.");
  const reminder = await Relance.findByPk(reminderId, { ...lock(transaction) });
  if (!reminder || Number(reminder.caseId) !== Number(metadata.caseId))
    notFound("Relance introuvable");
  if (reminder.status !== "brouillon")
    conflict("Seule une relance brouillon est supprimable.");
  await reminder.destroy(txOptions(transaction));
  await audit(
    transaction,
    actor,
    "suppression",
    "reminder",
    reminderId,
    "Relance supprimée",
  );
}
