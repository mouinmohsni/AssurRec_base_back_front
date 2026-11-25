import { useEffect, useState } from "react";
import { useMutationForm } from "../../hooks/useMutationForm.js";
import { today, moneyInput } from "../../utils/format.js";
import { mutation } from "../../services/http.js";
import { parseMilli } from "../../utils/money.js";
import { notify } from "../../utils/notify.js";
import { apiError } from "../../utils/errors.js";
import { Modal } from "../../components/common/Modal.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Field } from "../../components/common/Field.jsx";
import { EntitySelect } from "../../components/common/EntitySelect.jsx";
import { FormError } from "../../components/common/FormError.jsx";
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function InstallmentForm({ open, item, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const form = useMutationForm({
    reference: item?.reference || "",
    contractId: String(item?.contractId || ""),
    dueDate: item?.dueDate || today(),
    amount: moneyInput(item?.amountMilli || 0),
  });
  const { reset } = form;
  useEffect(() => {
    setSelectedContract(null);
    reset({
      reference: item?.reference || "",
      contractId: String(item?.contractId || ""),
      dueDate: item?.dueDate || today(),
      amount: moneyInput(item?.amountMilli || 0),
    });
  }, [item, open, reset]);
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const amountMilli = parseMilli(form.form.amount);
    const contractId = Number(form.form.contractId);
    const values = {
      reference: form.form.reference.trim(),
      contractId,
      dueDate: form.form.dueDate,
      amountMilli,
    };
    const fields = {};
    if (!values.reference || values.reference.length > 60)
      fields.reference =
        "La référence est obligatoire (60 caractères maximum).";
    if (!Number.isSafeInteger(contractId) || contractId <= 0)
      fields.contractId = "Sélectionnez un contrat.";
    if (!validDate(values.dueDate))
      fields.dueDate = "La date d’échéance est invalide.";
    if (!Number.isSafeInteger(amountMilli) || amountMilli <= 0)
      fields.amount =
        "Le montant doit être positif, au plus 2 000 000,000 TND, avec trois décimales maximum.";
    if (
      validDate(values.dueDate) &&
      selectedContract &&
      (values.dueDate < selectedContract.startDate ||
        values.dueDate > selectedContract.endDate)
    ) {
      fields.dueDate =
        "La date d’échéance doit être comprise dans la période du contrat.";
    } else if (
      validDate(values.dueDate) &&
      contractId > 0 &&
      !selectedContract
    ) {
      fields.contractId =
        "Le contrat est encore chargé ; réessayez dans un instant.";
    }
    if (Object.keys(fields).length) {
      form.setError({
        message: "Vérifiez les champs indiqués.",
        fields,
      });
      return;
    }
    setBusy(true);
    try {
      if (item) await mutation(`/api/installments/${item.id}`, "PUT", values);
      else await mutation("/api/installments", "POST", values);
      notify(item ? "Échéance mise à jour." : "Échéance créée.");
      onSaved();
    } catch (reason) {
      form.setError(apiError(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={item ? "Modifier l’échéance" : "Nouvelle échéance"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="installment-form" loading={busy}>
            {item ? "Enregistrer" : "Créer l’échéance"}
          </Button>
        </>
      }
    >
      <form id="installment-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Référence" required error={form.fields.reference}>
            <input
              value={form.form.reference}
              onChange={(event) => form.set("reference", event.target.value)}
              required
              maxLength={60}
              disabled={busy}
            />
          </Field>
          <EntitySelect
            label="Contrat"
            resource="/api/contracts"
            value={form.form.contractId}
            onChange={(value) => form.set("contractId", value)}
            onSelect={setSelectedContract}
            required
            disabled={busy}
            enabled={open}
            renderOption={(contract) =>
              `${contract.reference} · ${contract.insuredName || "Assuré"}`
            }
            error={form.fields.contractId}
          />
          <Field label="Date d’échéance" required error={form.fields.dueDate}>
            <input
              type="date"
              value={form.form.dueDate}
              onChange={(event) => form.set("dueDate", event.target.value)}
              required
              disabled={busy}
            />
          </Field>
          <Field
            label="Montant (TND)"
            required
            error={form.fields.amount}
            help="Saisi en TND, stocké côté API en millimes."
          >
            <input
              inputMode="decimal"
              value={form.form.amount}
              onChange={(event) => form.set("amount", event.target.value)}
              placeholder="0.000"
              required
              maxLength={15}
              disabled={busy}
            />
          </Field>
        </div>
        <FormError message={form.error} />
      </form>
    </Modal>
  );
}
