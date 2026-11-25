import { Op, literal } from "sequelize";
import {
  Contrat,
  Echeance,
  Assure,
  Paiement,
  Dossier,
} from "../models/index.js";
import { mergeWhere, scopedWhere } from "./access.repository.js";

const attributes = [
  "id",
  "reference",
  "contractId",
  "dueDate",
  "amountMilli",
  "createdAt",
  [
    literal(
      "COALESCE((SELECT SUM(paid_scope.amount_milli) FROM payments AS paid_scope WHERE paid_scope.installment_id = `Echeance`.`id` AND paid_scope.status = 'valide'), 0)",
    ),
    "paidMilli",
  ],
];
const contractInclude = {
  model: Contrat,
  as: "contract",
  attributes: ["id", "reference", "insuredId", "insuranceType"],
  required: true,
  include: [
    {
      model: Assure,
      as: "insured",
      attributes: ["id", "name"],
      required: true,
    },
  ],
};

function paidExpression() {
  return literal(
    "COALESCE((SELECT SUM(p_status.amount_milli) FROM payments AS p_status WHERE p_status.installment_id = `Echeance`.`id` AND p_status.status = 'valide'), 0)",
  );
}

function statusCondition(status) {
  const paid = paidExpression();
  const today = new Date().toISOString().slice(0, 10);
  if (status === "regle")
    return literal(`(${paid.val} >= ` + "`Echeance`.`amount_milli`)");
  if (status === "a_venir")
    return literal(
      "`Echeance`.`due_date` > " +
        Echeance.sequelize.escape(today) +
        " AND (" +
        paid.val +
        ") < `Echeance`.`amount_milli`",
    );
  if (status === "partiel")
    return literal(
      "`Echeance`.`due_date` <= " +
        Echeance.sequelize.escape(today) +
        " AND (" +
        paid.val +
        ") > 0 AND (" +
        paid.val +
        ") < `Echeance`.`amount_milli`",
    );
  if (status === "impaye")
    return literal(
      "`Echeance`.`due_date` <= " +
        Echeance.sequelize.escape(today) +
        " AND (" +
        paid.val +
        ") = 0",
    );
  return undefined;
}

function includesForSearch(search) {
  if (!search) return [contractInclude];
  return [
    {
      ...contractInclude,
      include: [{ ...contractInclude.include[0], required: true }],
      required: true,
    },
  ];
}

export async function list(q = {}, actor, transaction) {
  const search = q.search?.trim();
  const root = {};
  if (q.contractId !== undefined) root.contractId = q.contractId;
  if (q.insuredId !== undefined) root["$contract.insured_id$"] = q.insuredId;
  if (q.from !== undefined)
    root.dueDate = { ...(root.dueDate || {}), [Op.gte]: q.from };
  if (q.to !== undefined)
    root.dueDate = { ...(root.dueDate || {}), [Op.lte]: q.to };
  if (search) {
    root[Op.or] = [
      { reference: { [Op.like]: `%${search}%` } },
      { "$contract.reference$": { [Op.like]: `%${search}%` } },
      { "$contract.insured.name$": { [Op.like]: `%${search}%` } },
    ];
  }
  const status = statusCondition(q.status);
  const result = await Echeance.findAndCountAll({
    attributes,
    where: mergeWhere(
      root,
      status ? { [Op.and]: [status] } : {},
      scopedWhere("installment", actor),
    ),
    include: includesForSearch(search),
    order: [
      ["dueDate", "DESC"],
      ["id", "DESC"],
    ],
    limit: q.limit,
    offset: q.offset,
    distinct: true,
    transaction,
  });
  return result;
}

export async function findById(id, actor, transaction, { lock = false } = {}) {
  return Echeance.findOne({
    attributes,
    where: mergeWhere({ id }, scopedWhere("installment", actor)),
    include: [{ ...contractInclude }],
    transaction,
    lock: lock ? transaction?.LOCK?.UPDATE : undefined,
  });
}

export async function lockById(id, transaction) {
  return Echeance.findOne({
    where: { id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

export async function lockContract(id, transaction) {
  return Contrat.findOne({
    where: { id },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
}

export async function create(values, transaction) {
  return Echeance.create(values, { transaction });
}

export async function updateById(id, values, transaction) {
  await Echeance.update(values, { where: { id }, transaction });
  return findById(id, null, transaction);
}

export async function removeById(id, transaction) {
  return Echeance.destroy({ where: { id }, transaction });
}

export async function paymentCount(id, transaction) {
  return Paiement.count({ where: { installmentId: id }, transaction });
}

export async function caseCount(id, transaction) {
  return Dossier.count({ where: { installmentId: id }, transaction });
}
