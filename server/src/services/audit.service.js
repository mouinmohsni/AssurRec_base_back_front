import { findAuditEvents } from "../repositories/audit-read.repository.js";
import { pageResult } from "../utils/pagination.js";
import { iso, numberValue } from "../config/index.js";

export async function auditList(query) {
  const { rows, count } = await findAuditEvents(query);
  return pageResult(
    rows.map((row) => ({
      id: numberValue(row.id),
      actorName: row.actor?.name ?? "Système",
      actorRole: row.actorRole,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId == null ? null : numberValue(row.entityId),
      details: row.details,
      createdAt: iso(row.createdAt),
    })),
    count,
    query,
  );
}
