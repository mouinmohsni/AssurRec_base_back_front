import { Op } from "sequelize";
import { Assure, Contrat } from "../models/index.js";
import { mergeWhere, scopedWhere } from "./access.repository.js";

const attributes = [
  "id",
  "reference",
  "name",
  "email",
  "phone",
  "address",
  "active",
  "createdAt",
];

export async function list(q = {}, actor, transaction) {
  const search = q.search?.trim();
  const where = search
    ? {
        [Op.or]: [
          { reference: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ],
      }
    : {};
  return Assure.findAndCountAll({
    attributes,
    where: mergeWhere(where, scopedWhere("insured", actor)),
    order: [["id", "DESC"]],
    limit: q.limit,
    offset: q.offset,
    transaction,
  });
}

export async function findById(id, actor, transaction, { lock = false } = {}) {
  return Assure.findOne({
    attributes,
    where: mergeWhere({ id }, scopedWhere("insured", actor)),
    transaction,
    lock: lock ? transaction?.LOCK?.UPDATE : undefined,
  });
}

export async function lockById(id, transaction) {
  return Assure.findOne({
    where: { id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

export async function create(values, transaction) {
  return Assure.create(values, { transaction });
}

export async function updateById(id, values, transaction) {
  await Assure.update(values, { where: { id }, transaction });
  return findById(id, null, transaction);
}

export async function removeById(id, transaction) {
  return Assure.destroy({ where: { id }, transaction });
}

export async function countContracts(insuredId, transaction) {
  return Contrat.count({ where: { insuredId }, transaction });
}
