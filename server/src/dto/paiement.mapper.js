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

export function toPaymentDto(input) {
  const row = values(input);
  const installment = values(row.installment);
  const contract = values(installment.contract);
  const insured = values(contract.insured);
  const recordedByUser = values(row.recordedByUser);
  const recoveryCase = values(row.case);
  return {
    id: number(row.id),
    reference: String(row.reference ?? ""),
    installmentId: number(row.installmentId ?? installment.id),
    installmentReference: String(
      row.installmentReference ?? installment.reference ?? "",
    ),
    insuredName: String(row.insuredName ?? insured.name ?? ""),
    caseId: id(row.caseId ?? recoveryCase.id),
    amountMilli: number(row.amountMilli),
    paidAt: date(row.paidAt),
    method: row.method,
    status: row.status,
    recordedBy: number(row.recordedBy ?? recordedByUser.id),
    recordedByName: String(row.recordedByName ?? recordedByUser.name ?? ""),
    reversalReason:
      row.reversalReason == null ? null : String(row.reversalReason),
    createdAt: iso(row.createdAt),
  };
}
