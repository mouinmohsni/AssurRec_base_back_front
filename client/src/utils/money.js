export const MAX_MILLI = 2_000_000_000;

// Les montants ne passent jamais par un calcul flottant : on assemble les millimes.
export function parseMilli(value) {
  if (typeof value !== "string") return Number.NaN;
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,3})?$/.test(normalized)) return Number.NaN;
  const [wholeText, decimalText = ""] = normalized.split(".");
  const whole = Number(wholeText);
  if (!Number.isSafeInteger(whole)) return Number.NaN;
  const milli = whole * 1000 + Number((decimalText + "000").slice(0, 3));
  if (!Number.isSafeInteger(milli) || milli > MAX_MILLI) return Number.NaN;
  return milli;
}
export default parseMilli;
