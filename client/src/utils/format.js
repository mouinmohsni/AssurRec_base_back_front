const dateFormatter = new Intl.DateTimeFormat("fr-TN", {
  dateStyle: "medium",
  timeZone: "UTC",
});
const dateTimeFormatter = new Intl.DateTimeFormat("fr-TN", {
  dateStyle: "medium",
  timeStyle: "short",
});
const tndFormatter = new Intl.NumberFormat("fr-TN", {
  style: "currency",
  currency: "TND",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
export function today() {
  return new Date().toISOString().slice(0, 10);
}
function asDate(value, dateOnly = false) {
  if (!value) return null;
  const text = String(value);
  const source =
    dateOnly && /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00Z` : text;
  const date = new Date(source);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function formatDate(value) {
  const date = asDate(value, true);
  return date ? dateFormatter.format(date) : "—";
}
export function formatDateTime(value) {
  const date = asDate(value);
  return date ? dateTimeFormatter.format(date) : "—";
}
export function formatTnd(milli) {
  return tndFormatter.format(Number.isSafeInteger(milli) ? milli / 1000 : 0);
}
export function moneyInput(milli) {
  return Number.isSafeInteger(milli) ? (milli / 1000).toFixed(3) : "0.000";
}
