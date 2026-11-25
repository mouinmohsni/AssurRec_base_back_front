import {
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError,
} from "sequelize";
import { withTransaction } from "../config/database.js";
import {
  requireActorRole,
  conflict,
  notFound,
  badRequest,
} from "../utils/errors.js";
import { pagination, pageResult, safeId } from "../utils/pagination.js";
import { validateAmountMilli } from "../domain/recouvrement.js";
import * as repository from "../repositories/echeance.repository.js";
import { audit } from "../repositories/audit.repository.js";
import { toInstallmentDto } from "../dto/echeance.mapper.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function dateOnly(value) {
  const date = String(value ?? "");
  if (!DATE_RE.test(date))
    badRequest("La date d’échéance doit être YYYY-MM-DD.");
  const [year, month, day] = date.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  )
    badRequest("La date d’échéance est invalide.");
  return date;
}
function valuesFrom(input) {
  const values = {
    reference: input?.reference,
    contractId: safeId(input?.contractId),
    dueDate: dateOnly(input?.dueDate),
    amountMilli: Number(input?.amountMilli),
  };
  try {
    validateAmountMilli(values.amountMilli);
    if (values.amountMilli > 2_000_000_000)
      badRequest("Le montant ne peut pas dépasser 2 000 000 000 millimes.");
  } catch (error) {
    if (error?.status) throw error;
    badRequest(error.message);
  }
  return values;
}
function mapPersistenceError(error) {
  if (error?.status) throw error;
  if (error instanceof UniqueConstraintError)
    conflict("La référence d’échéance est déjà utilisée.");
  if (error instanceof ForeignKeyConstraintError)
    conflict("Le contrat indiqué est introuvable.");
  if (error instanceof ValidationError)
    conflict(error.errors?.[0]?.message || "Données échéance invalides.");
  throw error;
}

export async function listInstallments(actor, q = {}) {
  const page = pagination(q);
  const result = await repository.list({ ...q, ...page }, actor);
  return pageResult(
    result.rows.map((row) => toInstallmentDto(row)),
    result.count,
    q,
  );
}

export async function getInstallment(id, actor, transaction) {
  const row = await repository.findById(safeId(id), actor, transaction);
  if (!row) notFound("Échéance introuvable");
  return toInstallmentDto(row);
}

export async function saveInstallment(actor, id, input) {
  requireActorRole(actor, "admin", "manager");
  const targetId = id === undefined || id === null ? undefined : safeId(id);
  const values = valuesFrom(input);
  try {
    return await withTransaction(async (transaction) => {
      // Parent contract puis échéance : le même ordre est utilisé par création,
      // modification et suppression pour protéger le graphe contre les courses.
      const contract = await repository.lockContract(
        values.contractId,
        transaction,
      );
      if (!contract) notFound("Contrat introuvable");
      if (
        values.dueDate < String(contract.startDate).slice(0, 10) ||
        values.dueDate > String(contract.endDate).slice(0, 10)
      ) {
        conflict("La date de l’échéance doit être dans la période du contrat.");
      }
      let previous;
      if (targetId) {
        previous = await repository.lockById(targetId, transaction);
        if (!previous) notFound("Échéance introuvable");
        const paymentCount = await repository.paymentCount(
          targetId,
          transaction,
        );
        if (paymentCount)
          conflict(
            "Une échéance avec paiement enregistré ne peut plus être modifiée.",
          );
        const caseCount = await repository.caseCount(targetId, transaction);
        const contractChanged =
          safeId(previous.contractId) !== values.contractId;
        const dueChanged =
          String(previous.dueDate).slice(0, 10) !== values.dueDate;
        const amountChanged =
          Number(previous.amountMilli) !== values.amountMilli;
        if (caseCount && (contractChanged || dueChanged || amountChanged)) {
          conflict(
            "Une échéance liée à un dossier ne peut pas changer de contrat, de date ou de montant.",
          );
        }
        await repository.updateById(targetId, values, transaction);
      } else {
        previous = await repository.create(values, transaction);
      }
      const entityId = targetId ?? previous.id;
      await audit(
        transaction,
        actor,
        targetId ? "modification" : "creation",
        "installment",
        entityId,
        targetId ? "Échéance modifiée" : "Échéance créée",
      );
      return toInstallmentDto(
        await repository.findById(entityId, null, transaction),
      );
    });
  } catch (error) {
    mapPersistenceError(error);
  }
}

export async function deleteInstallment(actor, id) {
  requireActorRole(actor, "admin", "manager");
  const installmentId = safeId(id);
  try {
    await withTransaction(async (transaction) => {
      const snapshot = await repository.findById(
        installmentId,
        null,
        transaction,
      );
      if (!snapshot) notFound("Échéance introuvable");
      await repository.lockContract(safeId(snapshot.contractId), transaction);
      const row = await repository.lockById(installmentId, transaction);
      if (!row) notFound("Échéance introuvable");
      if (
        (await repository.paymentCount(installmentId, transaction)) ||
        (await repository.caseCount(installmentId, transaction))
      ) {
        conflict(
          "Une échéance liée à une opération ne peut pas être supprimée.",
        );
      }
      await repository.removeById(installmentId, transaction);
      await audit(
        transaction,
        actor,
        "suppression",
        "installment",
        installmentId,
        "Échéance supprimée",
      );
    });
  } catch (error) {
    mapPersistenceError(error);
  }
}
