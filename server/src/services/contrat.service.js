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
import * as repository from "../repositories/contrat.repository.js";
import { audit } from "../repositories/audit.repository.js";
import { toContractDto } from "../dto/contrat.mapper.js";

const FIELDS = [
  "reference",
  "insuredId",
  "insuranceType",
  "startDate",
  "endDate",
  "status",
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dateOnly(value, label) {
  const date = String(value ?? "");
  if (!DATE_RE.test(date))
    badRequest(`${label} doit être une date YYYY-MM-DD.`);
  const [year, month, day] = date.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  )
    badRequest(`${label} est invalide.`);
  return date;
}

function contractValues(input) {
  const values = {};
  for (const field of FIELDS)
    if (input?.[field] !== undefined) values[field] = input[field];
  if (values.insuredId !== undefined)
    values.insuredId = safeId(values.insuredId);
  if (values.startDate !== undefined)
    values.startDate = dateOnly(values.startDate, "La date de début");
  if (values.endDate !== undefined)
    values.endDate = dateOnly(values.endDate, "La date de fin");
  if (
    values.startDate !== undefined &&
    values.endDate !== undefined &&
    values.startDate > values.endDate
  )
    conflict("La fin du contrat doit suivre son début.");
  return values;
}

function mapPersistenceError(error) {
  if (error?.status) throw error;
  if (error instanceof UniqueConstraintError)
    conflict("La référence du contrat est déjà utilisée.");
  if (error instanceof ForeignKeyConstraintError)
    conflict("L’assuré indiqué est introuvable ou encore utilisé.");
  if (error instanceof ValidationError)
    conflict(error.errors?.[0]?.message || "Données contrat invalides.");
  throw error;
}

export async function listContracts(actor, q = {}) {
  const page = pagination(q);
  const result = await repository.list({ ...q, ...page }, actor);
  return pageResult(result.rows.map(toContractDto), result.count, q);
}

export async function getContract(id, actor, transaction) {
  const row = await repository.findById(safeId(id), actor, transaction);
  if (!row) notFound("Contrat introuvable");
  return toContractDto(row);
}

export async function saveContract(actor, id, input) {
  requireActorRole(actor, "admin", "manager");
  const targetId = id === undefined || id === null ? undefined : safeId(id);
  const values = contractValues(input);
  if (!values.insuredId || !values.startDate || !values.endDate)
    badRequest("Les champs du contrat sont requis.");
  try {
    return await withTransaction(async (transaction) => {
      // Le parent assuré est toujours verrouillé avant le contrat : création et
      // modification suivent le même ordre, évitant le deadlock dépendant.
      const insured = await repository.lockInsured(
        values.insuredId,
        transaction,
      );
      if (!insured) notFound("Assuré introuvable");
      let row;
      if (targetId) {
        row = await repository.lockById(targetId, transaction);
        if (!row) notFound("Contrat introuvable");
        if (
          await repository.hasInstallmentOutside(
            targetId,
            values.startDate,
            values.endDate,
            transaction,
          )
        ) {
          conflict(
            "Les dates du contrat ne peuvent pas invalider une échéance existante.",
          );
        }
        await repository.updateById(targetId, values, transaction);
      } else {
        row = await repository.create(values, transaction);
      }
      const entityId = targetId ?? row.id;
      await audit(
        transaction,
        actor,
        targetId ? "modification" : "creation",
        "contract",
        entityId,
        targetId ? "Contrat modifié" : "Contrat créé",
      );
      return toContractDto(
        await repository.findById(entityId, null, transaction),
      );
    });
  } catch (error) {
    mapPersistenceError(error);
  }
}

export async function deleteContract(actor, id) {
  requireActorRole(actor, "admin", "manager");
  const contractId = safeId(id);
  try {
    await withTransaction(async (transaction) => {
      const snapshot = await repository.findById(contractId, null, transaction);
      if (!snapshot) notFound("Contrat introuvable");
      const insuredId = safeId(snapshot.insuredId);
      await repository.lockInsured(insuredId, transaction);
      const row = await repository.lockById(contractId, transaction);
      if (!row) notFound("Contrat introuvable");
      if (await repository.countInstallments(contractId, transaction))
        conflict("Un contrat avec échéances ne peut pas être supprimé.");
      await repository.removeById(contractId, transaction);
      await audit(
        transaction,
        actor,
        "suppression",
        "contract",
        contractId,
        "Contrat supprimé",
      );
    });
  } catch (error) {
    mapPersistenceError(error);
  }
}
