import { iso, numberValue } from "../config/index.js";

function safeId(value) {
  const n = numberValue(value);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new RangeError("Identifiant ORM invalide");
  return n;
}

function plain(row) {
  return row?.get ? row.get({ plain: true }) : row;
}

export function toContractDto(row) {
  const value = plain(row);
  const insured = value.insured ?? {};
  return {
    id: safeId(value.id),
    reference: String(value.reference ?? ""),
    insuredId: safeId(value.insuredId),
    insuredName: String(value.insuredName ?? insured.name ?? ""),
    insuranceType: String(value.insuranceType ?? ""),
    startDate: String(value.startDate ?? "").slice(0, 10),
    endDate: String(value.endDate ?? "").slice(0, 10),
    status: String(value.status ?? ""),
    createdAt: iso(value.createdAt),
  };
}

export const mapContract = toContractDto;
