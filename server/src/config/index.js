import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({
  path: path.resolve(here, "../../.env"),
  override: false,
  quiet: true,
});

const intEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};
export const bool = (value) =>
  value === true || value === 1 || value === "1" || value === "true";
export const numberValue = (value) =>
  typeof value === "bigint" ? Number(value) : Number(value ?? 0);

export const roles = ["admin", "manager", "agent"];
export const insuranceTypes = [
  "auto",
  "sante",
  "habitation",
  "vie",
  "professionnelle",
];
export const caseStatuses = [
  "nouveau",
  "en_cours",
  "promesse_paiement",
  "cloture",
];
export const priorities = ["basse", "normale", "haute"];
export const methods = ["virement", "cheque", "especes"];
export const reminderChannels = ["telephone", "email", "courrier", "sms"];

export const config = Object.freeze({
  port: intEnv("PORT", 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL?.trim() ?? "",
  cookieMode:
    process.env.COOKIE_MODE === "local-http" ? "local-http" : "https-preview",
  demoEnabled: bool(process.env.DEMO_ENABLED),
  demoPassword: process.env.DEMO_PASSWORD || "AssurRec-Demo-2026!",
  frontendDist: process.env.FRONTEND_DIST || "",
  corsOrigins: (
    process.env.CORS_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
});

export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}
export function iso(value) {
  if (value instanceof Date) return value.toISOString();
  const text = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text))
    return `${text.replace(" ", "T")}Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text))
    return `${text}Z`;
  return text;
}
export function assertDatabaseUrl() {
  if (!config.databaseUrl)
    throw new Error("DATABASE_URL est requis pour cette opération");
  return config.databaseUrl;
}
