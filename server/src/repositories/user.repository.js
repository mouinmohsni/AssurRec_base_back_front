import { Op } from "sequelize";
import { Dossier, Session, Utilisateur } from "../models/index.js";

export const publicUserAttributes = [
  "id",
  "name",
  "email",
  "role",
  "active",
  "createdAt",
];
export function userWhere(q = {}) {
  const where = {};
  if (q.role) where.role = q.role;
  if (q.search)
    where[Op.or] = [
      { name: { [Op.like]: `%${q.search}%` } },
      { email: { [Op.like]: `%${q.search}%` } },
    ];
  return where;
}
export function findUserByEmail(email, options = {}) {
  return Utilisateur.scope("withPassword").findOne({
    where: { email: email.toLowerCase() },
    ...options,
  });
}
export function findPublicUserById(id, options = {}) {
  return Utilisateur.findByPk(id, {
    attributes: publicUserAttributes,
    ...options,
  });
}
export function createUser(values, options = {}) {
  return Utilisateur.create(values, options);
}
export function listPublicUsers(q, options = {}) {
  return Utilisateur.findAndCountAll({
    where: userWhere(q),
    attributes: publicUserAttributes,
    ...options,
  });
}
export function findActiveAdmins(options = {}) {
  return Utilisateur.findAll({
    where: { role: "admin", active: true },
    attributes: publicUserAttributes,
    order: [["id", "ASC"]],
    ...options,
  });
}
export function lockActiveAdmins(transaction) {
  return Utilisateur.findAll({
    where: { role: "admin", active: true },
    attributes: ["id", "role", "active"],
    order: [["id", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}
export function findUserForUpdate(id, transaction) {
  return Utilisateur.findByPk(id, {
    attributes: { include: ["passwordHash"] },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}
export function findActiveAssignment(agentId, options = {}) {
  return Dossier.count({
    where: { agentId, status: { [Op.ne]: "cloture" } },
    ...options,
  });
}
export function invalidateUserSessions(userId, options = {}) {
  return Session.destroy({ where: { userId }, ...options });
}
