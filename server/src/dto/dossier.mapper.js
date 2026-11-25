function values(input) {
  return input?.dataValues ?? input ?? {};
}
function number(value) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}
function id(value) {
  return value == null ? null : number(value);
}
function date(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
function iso(value) {
  if (value == null || value === "") return "";
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(text))
    return `${text.replace(" ", "T")}Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text))
    return `${text}Z`;
  return text;
}

export function toCaseDto(input) {
  const row = values(input);
  const installment = values(row.installment);
  const contract = values(installment.contract);
  const insured = values(contract.insured);
  const agent = values(row.agent);
  const amountMilli = number(row.amountMilli ?? installment.amountMilli);
  const paidMilli = number(row.paidMilli);
  return {
    id: number(row.id),
    reference: String(row.reference ?? ""),
    installmentId: number(row.installmentId ?? installment.id),
    installmentReference: String(
      row.installmentReference ?? installment.reference ?? "",
    ),
    insuredId: number(row.insuredId ?? contract.insuredId ?? insured.id),
    insuredName: String(row.insuredName ?? insured.name ?? ""),
    contractReference: String(
      row.contractReference ?? contract.reference ?? "",
    ),
    insuranceType: row.insuranceType ?? contract.insuranceType,
    agentId: id(row.agentId ?? agent.id),
    agentName:
      row.agentName ??
      (row.agentId == null && agent.id == null ? null : (agent.name ?? null)),
    status: row.status,
    priority: row.priority,
    openedAt: date(row.openedAt),
    promiseDate: date(row.promiseDate),
    notes: String(row.notes ?? ""),
    amountMilli,
    paidMilli,
    balanceMilli: number(
      row.balanceMilli ?? Math.max(0, amountMilli - paidMilli),
    ),
    dueDate: date(row.dueDate ?? installment.dueDate),
  };
}

export function toAuditDto(input) {
  const row = values(input);
  const actor = values(row.actor);
  return {
    id: number(row.id),
    actorName: String(row.actorName ?? actor.name ?? "Système"),
    actorRole: row.actorRole ?? actor.role ?? null,
    action: String(row.action ?? ""),
    entityType: String(row.entityType ?? ""),
    entityId: id(row.entityId),
    details: String(row.details ?? ""),
    createdAt: iso(row.createdAt),
  };
}
