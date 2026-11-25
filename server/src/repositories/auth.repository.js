import { Op } from "sequelize";
import { Session, Utilisateur } from "../models/index.js";
import { publicUserAttributes } from "./user.repository.js";

export function findLoginUser(email, options = {}) {
  return Utilisateur.scope("withPassword").findOne({
    where: { email: email.toLowerCase() },
    ...options,
  });
}
export function createSession(values, options = {}) {
  return Session.create(values, options);
}
export function findSession(tokenHash, now = new Date(), options = {}) {
  return Session.findOne({
    where: { tokenHash, expiresAt: { [Op.gt]: now } },
    include: [
      {
        model: Utilisateur,
        as: "user",
        required: true,
        where: { active: true },
        attributes: publicUserAttributes,
      },
    ],
    ...options,
  });
}
export function removeSession(id, userId, options = {}) {
  return Session.destroy({ where: { id, userId }, ...options });
}
