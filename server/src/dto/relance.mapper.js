function values(input) {
  return input?.dataValues ?? input ?? {};
}
function number(value) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
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

export function toReminderDto(input) {
  const row = values(input);
  const recoveryCase = values(row.case);
  const installment = values(recoveryCase.installment);
  const contract = values(installment.contract);
  const insured = values(contract.insured);
  const createdByUser = values(row.createdByUser);
  return {
    id: number(row.id),
    caseId: number(row.caseId ?? recoveryCase.id),
    caseReference: String(row.caseReference ?? recoveryCase.reference ?? ""),
    insuredName: String(row.insuredName ?? insured.name ?? ""),
    channel: row.channel,
    subject: String(row.subject ?? ""),
    content: String(row.content ?? ""),
    status: row.status,
    scheduledDate: date(row.scheduledDate),
    createdByName: String(row.createdByName ?? createdByUser.name ?? ""),
    createdAt: iso(row.createdAt),
  };
}
