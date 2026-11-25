import { iso, numberValue, todayUtc } from "../config/index.js";

function safeId(value) {
  const n = numberValue(value);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new RangeError("Identifiant ORM invalide");
  return n;
}
function safeMilli(value, label) {
  const n = numberValue(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > 2_000_000_000)
    throw new RangeError(`${label} invalide`);
  return n;
}
function plain(row) {
  return row?.get ? row.get({ plain: true }) : row;
}

/**
 * `paidMilli` doit être la somme des paiements valides de la repository, jamais
 * un count de paiements scoped. Le mapper accepte une colonne calculée Sequelize
 * ou un argument explicite pour les lectures financières internes.
 */
export function toInstallmentDto(row, paidMilli) {
  const value = plain(row);
  const contract = value.contract ?? {};
  const insured = contract.insured ?? {};
  const amount = safeMilli(value.amountMilli, "Montant");
  const paid = safeMilli(paidMilli ?? value.paidMilli ?? 0, "Total payé");
  const balance = Math.max(0, amount - paid);
  const dueDate = String(value.dueDate ?? "").slice(0, 10);
  const today = todayUtc();
  const status =
    balance === 0
      ? "regle"
      : dueDate > today
        ? "a_venir"
        : paid > 0
          ? "partiel"
          : "impaye";
  return {
    id: safeId(value.id),
    reference: String(value.reference ?? ""),
    contractId: safeId(value.contractId ?? contract.id),
    contractReference: String(
      value.contractReference ?? contract.reference ?? "",
    ),
    insuredId: safeId(value.insuredId ?? contract.insuredId ?? insured.id),
    insuredName: String(value.insuredName ?? insured.name ?? ""),
    insuranceType: String(value.insuranceType ?? contract.insuranceType ?? ""),
    dueDate,
    amountMilli: amount,
    paidMilli: paid,
    balanceMilli: balance,
    status,
    createdAt: iso(value.createdAt),
  };
}

export const mapInstallment = toInstallmentDto;
