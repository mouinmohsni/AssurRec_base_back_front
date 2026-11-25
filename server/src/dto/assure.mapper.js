import { iso, numberValue } from "../config/index.js";

function safeId(value) {
  const n = numberValue(value);
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new RangeError("Identifiant ORM invalide");
  return n;
}

export function toInsuredDto(row) {
  const value = row?.get ? row.get({ plain: true }) : row;
  return {
    id: safeId(value.id),
    reference: String(value.reference ?? ""),
    name: String(value.name ?? ""),
    email: String(value.email ?? ""),
    phone: String(value.phone ?? ""),
    address: String(value.address ?? ""),
    active: Boolean(value.active),
    createdAt: iso(value.createdAt),
  };
}

export const mapInsured = toInsuredDto;
