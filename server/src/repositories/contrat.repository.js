import { Op } from "sequelize";
import { Contrat, Assure } from "../models/index.js";
import { mergeWhere, scopedWhere } from "./access.repository.js";

const attributes = [
  "id",
  "reference",
  "insuredId",
  "insuranceType",
  "startDate",
  "endDate",
  "status",
  "createdAt",
];
const insuredInclude = {
  model: Assure,
  as: "insured",
  attributes: ["id", "name"],
  required: false,
};

function includesForSearch(search) {
  if (!search) return [insuredInclude];
  return [{ ...insuredInclude, required: true }];
}

export async function list(q = {}, actor, transaction) {
  const search = q.search?.trim();
  const root = {};
  if (q.insuredId !== undefined) root.insuredId = q.insuredId;
  if (q.insuranceType !== undefined) root.insuranceType = q.insuranceType;
  if (q.status !== undefined) root.status = q.status;
  if (search) {
    root[Op.or] = [
      { reference: { [Op.like]: `%${search}%` } },
      { "$insured.name$": { [Op.like]: `%${search}%` } },
    ];
  }
  const result = await Contrat.findAndCountAll({
    attributes,
    where: mergeWhere(root, scopedWhere("contract", actor)),
    include: includesForSearch(search),
    distinct: true,
    order: [["id", "DESC"]],
    limit: q.limit,
    offset: q.offset,
    transaction,
  });
  return result;
}

export async function findById(id, actor, transaction, { lock = false } = {}) {
  return Contrat.findOne({
    attributes,
    where: mergeWhere({ id }, scopedWhere("contract", actor)),
    include: [{ ...insuredInclude, required: true }],
    transaction,
    lock: lock ? transaction?.LOCK?.UPDATE : undefined,
  });
}

export async function lockById(id, transaction) {
  return Contrat.findOne({
    where: { id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

export async function lockInsured(id, transaction) {
  return Assure.findOne({
    where: { id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

export async function create(values, transaction) {
  return Contrat.create(values, { transaction });
}

export async function updateById(id, values, transaction) {
  await Contrat.update(values, { where: { id }, transaction });
  return findById(id, null, transaction);
}

export async function removeById(id, transaction) {
  return Contrat.destroy({ where: { id }, transaction });
}

export async function countInstallments(contractId, transaction) {
  const { Echeance } = await import("../models/index.js");
  return Echeance.count({ where: { contractId }, transaction });
}

export async function hasInstallmentOutside(
  contractId,
  startDate,
  endDate,
  transaction,
) {
  const { Echeance } = await import("../models/index.js");
  return Boolean(
    await Echeance.count({
      where: {
        contractId,
        [Op.or]: [
          { dueDate: { [Op.lt]: startDate } },
          { dueDate: { [Op.gt]: endDate } },
        ],
      },
      transaction,
    }),
  );
}
