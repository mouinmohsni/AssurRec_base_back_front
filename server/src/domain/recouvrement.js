import { badRequest, conflict } from "../utils/errors.js";

export class FinancialRuleError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "FinancialRuleError";
    this.kind = kind;
  }
}

function fail(kind, message) {
  throw new FinancialRuleError(kind, message);
}

export function validateAmountMilli(amountMilli) {
  if (!Number.isSafeInteger(amountMilli) || amountMilli <= 0) {
    fail("validation", "Le montant doit être un entier positif en millimes.");
  }
  return amountMilli;
}

export function validateBalanceMilli(balanceMilli) {
  if (!Number.isSafeInteger(balanceMilli) || balanceMilli < 0) {
    fail(
      "validation",
      "Le solde doit être un entier positif ou nul en millimes.",
    );
  }
  return balanceMilli;
}

export function calculateBalanceMilli(amountMilli, paidMilli) {
  validateAmountMilli(amountMilli);
  if (!Number.isSafeInteger(paidMilli) || paidMilli < 0) {
    fail(
      "validation",
      "Le total payé doit être un entier positif ou nul en millimes.",
    );
  }
  if (paidMilli > amountMilli) {
    fail(
      "validation",
      "Le total payé ne peut pas dépasser le montant de l’échéance.",
    );
  }
  return validateBalanceMilli(amountMilli - paidMilli);
}

export function assertPaymentWithinBalance(paymentMilli, balanceMilli) {
  validateAmountMilli(paymentMilli);
  validateBalanceMilli(balanceMilli);
  if (paymentMilli > balanceMilli) {
    fail("conflict", "Le paiement ne peut pas dépasser le solde dû.");
  }
}

export function assertOverdueWithDebt(dueDate, balanceMilli, today) {
  validateBalanceMilli(balanceMilli);
  if (dueDate >= today || balanceMilli <= 0) {
    fail(
      "conflict",
      "Un dossier exige une échéance dépassée avec un solde positif.",
    );
  }
}

export function assertCaseTransition(
  current,
  next,
  role,
  balanceMilli,
  promiseDate,
  today,
) {
  validateBalanceMilli(balanceMilli);
  const allowed =
    (current === "nouveau" && next === "en_cours") ||
    (current === "en_cours" &&
      ["promesse_paiement", "cloture"].includes(next)) ||
    (current === "promesse_paiement" &&
      ["en_cours", "cloture"].includes(next)) ||
    (current === "nouveau" && next === "cloture") ||
    (current === "cloture" &&
      next === "en_cours" &&
      ["admin", "manager"].includes(role));

  if (!allowed) fail("conflict", "Transition de dossier non autorisée.");
  if (current === "cloture" && next === "en_cours" && balanceMilli <= 0) {
    fail(
      "conflict",
      "Un dossier clôturé ne peut être rouvert que si un solde est dû.",
    );
  }
  if (next === "promesse_paiement" && (!promiseDate || promiseDate < today)) {
    fail("conflict", "Une date de promesse aujourd’hui ou future est requise.");
  }
  if (next === "cloture" && balanceMilli !== 0) {
    fail(
      "conflict",
      "Un dossier ne peut être clôturé que lorsque le solde est nul.",
    );
  }
}

export function applyFinancialRule(rule) {
  try {
    return rule();
  } catch (error) {
    if (error instanceof FinancialRuleError) {
      if (error.kind === "validation") badRequest(error.message);
      conflict(error.message);
    }
    throw error;
  }
}
