import { useEffect, useState } from "react";
import { useMutationForm } from "../../hooks/useMutationForm.js";
import { today } from "../../utils/format.js";
import { mutation } from "../../services/http.js";
import { notify } from "../../utils/notify.js";
import { apiError } from "../../utils/errors.js";
import { Modal } from "../../components/common/Modal.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Field } from "../../components/common/Field.jsx";
import { EntitySelect } from "../../components/common/EntitySelect.jsx";
import {
  insuranceLabel,
  contractStatusLabel,
} from "../../constants/business.js";
import { FormError } from "../../components/common/FormError.jsx";
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function ContractForm({ open, item, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const form = useMutationForm({
    reference: item?.reference || "",
    insuredId: String(item?.insuredId || ""),
    insuranceType: item?.insuranceType || "auto",
    startDate: item?.startDate || today(),
    endDate: item?.endDate || today(),
    status: item?.status || "actif",
  });
  const { reset } = form;
  useEffect(() => {
    reset({
      reference: item?.reference || "",
      insuredId: String(item?.insuredId || ""),
      insuranceType: item?.insuranceType || "auto",
      startDate: item?.startDate || today(),
      endDate: item?.endDate || today(),
      status: item?.status || "actif",
    });
  }, [item, open, reset]);
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const values = {
      reference: form.form.reference.trim(),
      insuredId: Number(form.form.insuredId),
      insuranceType: form.form.insuranceType,
      startDate: form.form.startDate,
      endDate: form.form.endDate,
      status: form.form.status,
    };
    const fields = {};
    if (!values.reference || values.reference.length > 60)
      fields.reference =
        "La référence est obligatoire (60 caractères maximum).";
    if (!Number.isSafeInteger(values.insuredId) || values.insuredId <= 0)
      fields.insuredId = "Sélectionnez un assuré.";
    if (!validDate(values.startDate))
      fields.startDate = "La date de début est invalide.";
    if (!validDate(values.endDate))
      fields.endDate = "La date de fin est invalide.";
    if (
      validDate(values.startDate) &&
      validDate(values.endDate) &&
      values.startDate > values.endDate
    )
      fields.endDate =
        "La date de fin doit être postérieure ou égale au début.";
    if (Object.keys(fields).length) {
      form.setError({
        message: "Vérifiez les champs indiqués.",
        fields,
      });
      return;
    }
    setBusy(true);
    try {
      if (item) await mutation(`/api/contracts/${item.id}`, "PUT", values);
      else await mutation("/api/contracts", "POST", values);
      notify(item ? "Contrat mis à jour." : "Contrat créé.");
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
      title={item ? "Modifier le contrat" : "Nouveau contrat"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="contract-form" loading={busy}>
            {item ? "Enregistrer" : "Créer le contrat"}
          </Button>
        </>
      }
    >
      <form id="contract-form" onSubmit={submit}>
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
            label="Assuré"
            resource="/api/insureds"
            value={form.form.insuredId}
            onChange={(value) => form.set("insuredId", value)}
            required
            disabled={busy}
            enabled={open}
            renderOption={(insured) => `${insured.reference} · ${insured.name}`}
            error={form.fields.insuredId}
          />
          <Field
            label="Type d’assurance"
            required
            error={form.fields.insuranceType}
          >
            <select
              value={form.form.insuranceType}
              onChange={(event) =>
                form.set("insuranceType", event.target.value)
              }
              required
              disabled={busy}
            >
              {Object.entries(insuranceLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut interne" required error={form.fields.status}>
            <select
              value={form.form.status}
              onChange={(event) => form.set("status", event.target.value)}
              required
              disabled={busy}
            >
              {Object.entries(contractStatusLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date de début" required error={form.fields.startDate}>
            <input
              type="date"
              value={form.form.startDate}
              onChange={(event) => form.set("startDate", event.target.value)}
              required
              disabled={busy}
            />
          </Field>
          <Field label="Date de fin" required error={form.fields.endDate}>
            <input
              type="date"
              value={form.form.endDate}
              onChange={(event) => form.set("endDate", event.target.value)}
              required
              disabled={busy}
            />
          </Field>
        </div>
        <FormError message={form.error} />
      </form>
    </Modal>
  );
}
