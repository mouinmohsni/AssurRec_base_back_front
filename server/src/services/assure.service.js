import {
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError,
} from "sequelize";
import { withTransaction } from "../config/database.js";
import { requireActorRole, conflict, notFound } from "../utils/errors.js";
import { pagination, pageResult, safeId } from "../utils/pagination.js";
import * as repository from "../repositories/assure.repository.js";
import { audit } from "../repositories/audit.repository.js";
import { toInsuredDto } from "../dto/assure.mapper.js";

const FIELDS = ["reference", "name", "email", "phone", "address", "active"];

function valuesFrom(input, { create = false } = {}) {
  const values = {};
  for (const field of FIELDS)
    if (input?.[field] !== undefined) values[field] = input[field];
  if (create && values.active === undefined) values.active = true;
  return values;
}

function mapPersistenceError(error) {
  if (error?.status) throw error;
  if (error instanceof UniqueConstraintError)
    conflict("La référence ou l’e-mail est déjà utilisé.");
  if (error instanceof ForeignKeyConstraintError)
    conflict("L’assuré est encore référencé par une autre ressource.");
  if (error instanceof ValidationError)
    conflict(error.errors?.[0]?.message || "Données assurés invalides.");
  throw error;
}

export async function listInsureds(actor, q = {}) {
  const page = pagination(q);
  const result = await repository.list({ ...q, ...page }, actor);
  return pageResult(result.rows.map(toInsuredDto), result.count, q);
}

export async function getInsured(id, actor, transaction) {
  const row = await repository.findById(safeId(id), actor, transaction);
  if (!row) notFound("Assuré introuvable");
  return toInsuredDto(row);
}

export async function saveInsured(actor, id, input) {
  requireActorRole(actor, "admin", "manager");
  const targetId = id === undefined || id === null ? undefined : safeId(id);
  try {
    return await withTransaction(async (transaction) => {
      let row;
      if (targetId) {
        row = await repository.lockById(targetId, transaction);
        if (!row) notFound("Assuré introuvable");
        await repository.updateById(targetId, valuesFrom(input), transaction);
      } else {
        row = await repository.create(
          valuesFrom(input, { create: true }),
          transaction,
        );
      }
      const entityId = targetId ?? row.id;
      await audit(
        transaction,
        actor,
        targetId ? "modification" : "creation",
        "insured",
        entityId,
        targetId ? "Assuré modifié" : "Assuré créé",
      );
      const fresh = await repository.findById(entityId, null, transaction);
      return toInsuredDto(fresh);
    });
  } catch (error) {
    mapPersistenceError(error);
  }
}

export async function deleteInsured(actor, id) {
  requireActorRole(actor, "admin", "manager");
  const insuredId = safeId(id);
  try {
    await withTransaction(async (transaction) => {
      const row = await repository.lockById(insuredId, transaction);
      if (!row) notFound("Assuré introuvable");
      const related = await repository.countContracts(insuredId, transaction);
      if (related)
        conflict(
          "Un assuré lié à un contrat ne peut pas être supprimé; désactivez-le.",
        );
      await repository.removeById(insuredId, transaction);
      await audit(
        transaction,
        actor,
        "suppression",
        "insured",
        insuredId,
        "Assuré supprimé",
      );
    });
  } catch (error) {
    mapPersistenceError(error);
  }
}
