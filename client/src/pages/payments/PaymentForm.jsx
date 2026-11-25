import { useState, useEffect } from "react";
import { moneyInput, today, formatTnd } from "../../utils/format.js";
import { mutation } from "../../services/http.js";
import { apiError } from "../../utils/errors.js";
import { parseMilli } from "../../utils/money.js";
import { notify } from "../../utils/notify.js";
import { Modal } from "../../components/common/Modal.jsx";
import { Button } from "../../components/common/Button.jsx";
import { EntitySelect } from "../../components/common/EntitySelect.jsx";
import { Field } from "../../components/common/Field.jsx";
import { paymentMethodLabel } from "../../constants/business.js";
import { FormError } from "../../components/common/FormError.jsx";
export function PaymentForm({ open, installment, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(installment || null);
  const [amount, setAmount] = useState(
    installment ? moneyInput(installment.balanceMilli) : "",
  );
  const [paidAt, setPaidAt] = useState(today());
  const [method, setMethod] = useState("virement");
  const [reference, setReference] = useState("");
  useEffect(() => {
    setSelected(installment || null);
    setAmount(installment ? moneyInput(installment.balanceMilli) : "");
    setPaidAt(today());
    setMethod("virement");
    setReference("");
    setError("");
  }, [open, installment]);
  const chosen = installment || selected;
  const chooseInstallment = (next) => {
    setSelected(next);
    if (next) setAmount(moneyInput(next.balanceMilli));
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const milli = parseMilli(amount);
    const normalizedReference = reference.trim();
    if (!chosen) {
      setError("Sélectionnez une échéance.");
      return;
    }
    if (!Number.isSafeInteger(milli) || milli <= 0) {
      setError(
        "Le paiement doit être strictement positif et ne pas dépasser 2 000 000 000 millimes.",
      );
      return;
    }
    if (milli > chosen.balanceMilli) {
      setError("Le montant ne peut pas dépasser le solde de cette échéance.");
      return;
    }
    if (!normalizedReference || normalizedReference.length > 60) {
      setError(
        "La référence de pièce est obligatoire et limitée à 60 caractères.",
      );
      return;
    }
    if (!paidAt || !method) {
      setError("La date et la méthode du paiement sont obligatoires.");
      return;
    }
    setBusy(true);
    try {
      await mutation("/api/payments", "POST", {
        installmentId: chosen.id,
        amountMilli: milli,
        paidAt,
        method,
        reference: normalizedReference,
      });
      notify("Paiement enregistré.");
      onSaved();
    } catch (reason) {
      setError(apiError(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      busy={busy}
      onClose={onClose}
      title="Enregistrer un paiement"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="payment-form" loading={busy}>
            Valider le paiement
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit}>
        <div className="form-grid">
          <EntitySelect
            label="Échéance"
            resource="/api/installments"
            value={chosen ? String(chosen.id) : ""}
            onChange={() => {}}
            onSelect={chooseInstallment}
            required
            enabled={open}
            disabled={busy || Boolean(installment)}
            selectedItem={installment}
            filter={(item) => item.balanceMilli > 0}
            renderOption={(item) =>
              `${item.reference} · ${item.insuredName} · ${formatTnd(item.balanceMilli)}`
            }
            help={
              installment
                ? "Échéance liée au dossier courant."
                : "Les échéances avec un solde positif restent sélectionnables, y compris futures."
            }
          />
          <Field
            label="Montant (TND)"
            required
            help={
              chosen
                ? `Solde maximum : ${formatTnd(chosen.balanceMilli)}`
                : "Montant en TND, trois décimales."
            }
          >
            <input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              disabled={busy}
            />
          </Field>
          <Field label="Date du paiement" required>
            <input
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              required
              disabled={busy}
            />
          </Field>
          <Field label="Méthode" required>
            <select
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              disabled={busy}
            >
              {Object.entries(paymentMethodLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Référence de pièce" required>
            <input
              required
              minLength={1}
              maxLength={60}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ex. PIECE-2026-001"
              disabled={busy}
            />
          </Field>
        </div>
        <FormError message={error} />
      </form>
    </Modal>
  );
}
