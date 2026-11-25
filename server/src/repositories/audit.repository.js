import { AuditEvent } from "../models/index.js";

export async function audit(
  transaction,
  actor,
  action,
  entityType,
  entityId,
  details,
) {
  const text =
    typeof details === "string" ? details : JSON.stringify(details ?? {});
  return AuditEvent.create(
    {
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
      action: String(action),
      entityType: String(entityType),
      entityId: entityId ?? null,
      details: text.slice(0, 4000),
    },
    { transaction },
  );
}
