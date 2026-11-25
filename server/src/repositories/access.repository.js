import { Op, literal } from "sequelize";
import { sequelize } from "../models/index.js";
import { safeId } from "../utils/pagination.js";

/**
 * Les listes master-data d’un agent sont filtrées par l’existence d’un dossier
 * qui lui est affecté. L’identifiant est validé puis échappé par Sequelize ; les
 * noms de tables/colonnes sont constants et jamais issus d’une requête.
 */
export function agentScope(resource, actor) {
  if (!actor || actor.role !== "agent") return undefined;
  const actorId = safeId(actor.id);
  const escapedActor = sequelize.escape(actorId);
  const root =
    resource === "insured"
      ? "Assure"
      : resource === "contract"
        ? "Contrat"
        : "Echeance";
  const sql =
    resource === "insured"
      ? `EXISTS (SELECT 1 FROM recovery_cases AS rc_scope INNER JOIN installments AS x_scope ON x_scope.id = rc_scope.installment_id INNER JOIN contracts AS c_scope ON c_scope.id = x_scope.contract_id WHERE c_scope.insured_id = \`${root}\`.\`id\` AND rc_scope.agent_id = ${escapedActor})`
      : resource === "contract"
        ? `EXISTS (SELECT 1 FROM recovery_cases AS rc_scope INNER JOIN installments AS x_scope ON x_scope.id = rc_scope.installment_id WHERE x_scope.contract_id = \`${root}\`.\`id\` AND rc_scope.agent_id = ${escapedActor})`
        : `EXISTS (SELECT 1 FROM recovery_cases AS rc_scope WHERE rc_scope.installment_id = \`${root}\`.\`id\` AND rc_scope.agent_id = ${escapedActor})`;
  return literal(sql);
}

export function scopedWhere(resource, actor) {
  const scope = agentScope(resource, actor);
  return scope ? { [Op.and]: [scope] } : {};
}

export function mergeWhere(...parts) {
  const present = parts.filter((part) => part && Reflect.ownKeys(part).length);
  if (!present.length) return {};
  return { [Op.and]: present };
}
