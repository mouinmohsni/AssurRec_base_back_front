import { badRequest } from "./errors.js";

export function safeId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) badRequest("Identifiant invalide.");
  return id;
}
export function pagination({ page = 1, pageSize = 10 } = {}) {
  const offset = (page - 1) * pageSize;
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100 ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  )
    badRequest("Pagination invalide.");
  return { limit: pageSize, offset };
}
export function pageResult(items, total, q) {
  return {
    items,
    total: Number(total),
    page: q.page ?? 1,
    pageSize: q.pageSize ?? 10,
  };
}
