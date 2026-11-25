import { Op } from "sequelize";
import { AuditEvent, Utilisateur } from "../models/index.js";
import { pagination } from "../utils/pagination.js";

export async function findAuditEvents(query) {
  const conditions = [];
  if (query.search)
    conditions.push({
      [Op.or]: ["action", "entityType", "details"].map((key) => ({
        [key]: { [Op.like]: `%${query.search}%` },
      })),
    });
  if (query.entityType) conditions.push({ entityType: query.entityType });
  const dates = {};
  if (query.from) dates[Op.gte] = new Date(`${query.from}T00:00:00Z`);
  if (query.to) {
    const end = new Date(`${query.to}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    dates[Op.lt] = end;
  }
  if (query.from || query.to) conditions.push({ createdAt: dates });
  return AuditEvent.findAndCountAll({
    where: { [Op.and]: conditions },
    ...pagination(query),
    order: [["id", "DESC"]],
    include: [
      {
        model: Utilisateur,
        as: "actor",
        attributes: ["id", "name"],
        required: false,
      },
    ],
    distinct: true,
  });
}
