import { readDashboard } from "../repositories/dashboard.repository.js";
import { config, todayUtc, iso, numberValue as n } from "../config/index.js";
import { safeId } from "../utils/pagination.js";
import { badRequest, requireActorRole } from "../utils/errors.js";

const dateOnly = (value) =>
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
export async function dashboard(actor, query = {}) {
  requireActorRole(actor, "admin", "manager", "agent");
  const from =
    query.from ??
    new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
  const to = query.to ?? todayUtc();
  if (from > to) badRequest("Période invalide.");
  const agentId =
    actor.role === "agent"
      ? safeId(actor.id)
      : query.agentId
        ? safeId(query.agentId)
        : undefined;
  const data = await readDashboard({
    from,
    to,
    agentId,
    insuranceType: query.insuranceType,
  });
  const expected = n(data.summary.expected);
  const paid = n(data.summary.collectedCurrent);
  const months = new Map();
  for (const row of data.expectedMonths)
    months.set(row.month, {
      month: row.month,
      expectedMilli: n(row.expectedMilli),
      collectedMilli: 0,
    });
  for (const row of data.collectedMonths) {
    const entry = months.get(row.month) ?? {
      month: row.month,
      expectedMilli: 0,
      collectedMilli: 0,
    };
    entry.collectedMilli = n(row.collectedMilli);
    months.set(row.month, entry);
  }
  return {
    kpis: {
      outstandingMilli: Math.max(0, expected - paid),
      collectedMilli: n(data.collected.total),
      overdueCount: n(data.summary.overdue),
      activeCases: n(data.active.total),
      recoveryRate: expected ? Number(((paid / expected) * 100).toFixed(2)) : 0,
    },
    monthly: [...months.values()].sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
    aging: data.aging.map((row) => ({
      label: row.label,
      amountMilli: n(row.amountMilli),
      count: n(row.count),
    })),
    byStatus: data.statuses.map((row) => ({
      status: row.status,
      count: n(row.count),
    })),
    priorityCases: data.priority.map((row) => ({
      id: n(row.id),
      reference: row.reference,
      installmentId: n(row.installmentId),
      installmentReference: row.installmentReference,
      insuredId: n(row.insuredId),
      insuredName: row.insuredName,
      contractReference: row.contractReference,
      insuranceType: row.insuranceType,
      agentId: row.agentId == null ? null : n(row.agentId),
      agentName: row.agentName ?? null,
      status: row.status,
      priority: row.priority,
      openedAt: dateOnly(row.openedAt),
      promiseDate: row.promiseDate == null ? null : dateOnly(row.promiseDate),
      notes: row.notes,
      amountMilli: n(row.amountMilli),
      paidMilli: n(row.paidMilli),
      balanceMilli: Math.max(0, n(row.amountMilli) - n(row.paidMilli)),
      dueDate: dateOnly(row.dueDate),
    })),
    recentPayments: data.recent.map((row) => ({
      id: n(row.id),
      reference: row.reference,
      installmentId: n(row.installmentId),
      installmentReference: row.installmentReference,
      insuredName: row.insuredName,
      caseId: row.caseId == null ? null : n(row.caseId),
      amountMilli: n(row.amountMilli),
      paidAt: dateOnly(row.paidAt),
      method: row.method,
      status: row.status,
      recordedBy: n(row.recordedBy),
      recordedByName: row.recordedByName,
      reversalReason: row.reversalReason ?? null,
      createdAt: iso(row.createdAt),
    })),
  };
}
