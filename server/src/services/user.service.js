import { withTransaction } from "../config/database.js";
import {
  conflict,
  forbidden,
  notFound,
  requireActorRole,
} from "../utils/errors.js";
import { roles, config } from "../config/index.js";
import { Utilisateur } from "../models/index.js";
import { audit } from "../repositories/audit.repository.js";
import {
  createUser,
  findActiveAssignment,
  findPublicUserById,
  findUserForUpdate,
  invalidateUserSessions,
  listPublicUsers,
  lockActiveAdmins,
  publicUserAttributes,
} from "../repositories/user.repository.js";
import { hashSecret } from "./auth.service.js";
import { publicUser } from "../dto/user.mapper.js";
import { pagination } from "../utils/pagination.js";

function assertAdmin(actor) {
  requireActorRole(actor, "admin");
}
function cleanEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}
function assertRole(role) {
  if (!roles.includes(role)) forbidden("Rôle utilisateur invalide");
}
function mapUsers(rows) {
  return rows.map(publicUser);
}

export async function listUsers(q = {}, actor) {
  assertAdmin(actor);
  const { limit, offset } = pagination(q);
  const result = await listPublicUsers(q, {
    limit,
    offset,
    order: [["id", "DESC"]],
  });
  return {
    items: mapUsers(result.rows),
    total: Number(result.count),
    page: q.page ?? 1,
    pageSize: q.pageSize ?? 10,
  };
}

async function lockAdminGuard(transaction) {
  return lockActiveAdmins(transaction);
}
async function assertCanDisableOrDemote(
  target,
  nextRole,
  nextActive,
  transaction,
) {
  const removesAdmin =
    target.role === "admin" &&
    target.active &&
    (nextRole !== "admin" || nextActive === false);
  if (removesAdmin) {
    const admins = await lockAdminGuard(transaction);
    if (admins.length <= 1)
      conflict("Au moins un administrateur actif est requis.");
  }
  const removesAgent =
    target.role === "agent" &&
    target.active &&
    (nextRole !== "agent" || nextActive === false);
  if (removesAgent) {
    const assignments = await findActiveAssignment(target.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (assignments > 0)
      conflict(
        "Cet agent possède des dossiers actifs; réaffectez-les avant de le désactiver.",
      );
  }
}

export async function saveUser(actor, id, input = {}) {
  assertAdmin(actor);
  return withTransaction(async (transaction) => {
    // Verrouiller la série complète des admins avant toute mutation de rôle/active.
    await lockAdminGuard(transaction);
    let target = id ? await findUserForUpdate(id, transaction) : null;
    if (id && !target) notFound("Utilisateur introuvable");
    const role = input.role ?? target?.role ?? "agent";
    const active = input.active ?? target?.active ?? true;
    assertRole(role);
    if (!target) {
      const passwordHash = await hashSecret(input.password);
      target = await createUser(
        {
          name: String(input.name),
          email: cleanEmail(input.email),
          role,
          active: active !== false,
          passwordHash,
        },
        { transaction },
      );
      await audit(
        transaction,
        actor,
        "creation",
        "user",
        target.id,
        "Utilisateur créé",
      );
    } else {
      const previousRole = target.role;
      const previousActive = target.active;
      await assertCanDisableOrDemote(target, role, active, transaction);
      const values = {};
      for (const key of ["name", "email", "role", "active"])
        if (input[key] !== undefined)
          values[key] = key === "email" ? cleanEmail(input[key]) : input[key];
      if (input.password !== undefined)
        values.passwordHash = await hashSecret(input.password);
      await target.update(values, { transaction });
      if (
        values.passwordHash ||
        values.active === false ||
        (values.role && values.role !== previousRole) ||
        (values.active !== undefined && values.active !== previousActive)
      )
        await invalidateUserSessions(target.id, { transaction });
      await audit(
        transaction,
        actor,
        "modification",
        "user",
        target.id,
        "Utilisateur modifié",
      );
    }
    return publicUser(await findPublicUserById(target.id, { transaction }));
  });
}

export async function deactivateUser(actor, id) {
  assertAdmin(actor);
  return withTransaction(async (transaction) => {
    await lockAdminGuard(transaction);
    const target = await findUserForUpdate(id, transaction);
    if (!target) notFound("Utilisateur introuvable");
    await assertCanDisableOrDemote(target, target.role, false, transaction);
    await target.update({ active: false }, { transaction });
    await invalidateUserSessions(target.id, { transaction });
    await audit(
      transaction,
      actor,
      "désactivation",
      "user",
      target.id,
      "Utilisateur désactivé",
    );
    return publicUser(target);
  });
}

export async function listAgents(actor) {
  if (!actor) forbidden("Connexion requise");
  const where =
    actor.role === "agent"
      ? { id: actor.id, role: "agent", active: true }
      : { role: "agent", active: true };
  const rows = await Utilisateur.findAll({
    where,
    attributes: publicUserAttributes,
    order: [
      ["name", "ASC"],
      ["id", "ASC"],
    ],
    raw: false,
  });
  return mapUsers(rows);
}

export async function demoInfo() {
  if (!config.demoEnabled) return { enabled: false };
  return {
    enabled: true,
    accounts: [
      {
        email: "admin@assurrec.demo",
        name: "Administrateur démo",
        role: "admin",
      },
      {
        email: "gestionnaire@assurrec.demo",
        name: "Gestionnaire démo",
        role: "manager",
      },
      { email: "agent@assurrec.demo", name: "Agent démo", role: "agent" },
    ],
  };
}
