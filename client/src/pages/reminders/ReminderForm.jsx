import { useState, useEffect } from "react";
import { mutation } from "../../services/http.js";
import { apiError } from "../../utils/errors.js";
import { notify } from "../../utils/notify.js";
import { Modal } from "../../components/common/Modal.jsx";
import { Button } from "../../components/common/Button.jsx";
import { EntitySelect } from "../../components/common/EntitySelect.jsx";
import { reminderChannelLabel } from "../../constants/business.js";
import { Field } from "../../components/common/Field.jsx";
import { FormError } from "../../components/common/FormError.jsx";
export function ReminderForm({ open, item, caseId, onClose, onSaved }) {
  const [caseEntity, setCaseEntity] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    caseId: String(caseId || item?.caseId || ""),
    channel: item?.channel || "telephone",
    subject: item?.subject || "",
    content: item?.content || "",
    status: item?.status || "brouillon",
    scheduledDate: item?.scheduledDate || "",
  });
  useEffect(() => {
    setCaseEntity(null);
    setForm({
      caseId: String(caseId || item?.caseId || ""),
      channel: item?.channel || "telephone",
      subject: item?.subject || "",
      content: item?.content || "",
      status: item?.status || "brouillon",
      scheduledDate: item?.scheduledDate || "",
    });
    setError("");
  }, [open, item, caseId]);
  const lockedCase = Boolean(caseId || item);
  const set = (key, value) =>
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!form.caseId) {
      setError("Sélectionnez un dossier.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        caseId: Number(form.caseId),
        channel: form.channel,
        subject: form.subject.trim(),
        content: form.content.trim(),
        status: form.status,
        scheduledDate: form.scheduledDate || null,
      };
      if (item) await mutation(`/api/reminders/${item.id}`, "PUT", body);
      else await mutation("/api/reminders", "POST", body);
      notify(item ? "Relance mise à jour." : "Relance enregistrée.");
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
      title={item ? "Modifier le brouillon" : "Nouvelle relance"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="reminder-form" loading={busy}>
            Enregistrer
          </Button>
        </>
      }
    >
      <form id="reminder-form" onSubmit={submit}>
        <div className="form-grid">
          <EntitySelect
            label="Dossier"
            resource="/api/cases"
            value={form.caseId}
            onChange={(value) => set("caseId", value)}
            onSelect={setCaseEntity}
            required
            enabled={open}
            disabled={busy || lockedCase}
            selectedItem={caseEntity}
            filter={(recoveryCase) => recoveryCase.status !== "cloture"}
            renderOption={(recoveryCase) =>
              `${recoveryCase.reference} · ${recoveryCase.insuredName}`
            }
            help={
              lockedCase
                ? "Le dossier d’une relance existante ou ouverte depuis un détail est immuable."
                : "Les dossiers nouveau, en cours et en promesse peuvent recevoir une relance."
            }
          />
          <Field label="Canal indicatif" required>
            <select
              value={form.channel}
              onChange={(event) => set("channel", event.target.value)}
              disabled={busy}
            >
              {Object.entries(reminderChannelLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Objet" required>
            <input
              value={form.subject}
              onChange={(event) => set("subject", event.target.value)}
              required
              minLength={1}
              maxLength={200}
              disabled={busy}
            />
          </Field>
          <Field label="Date prévue">
            <input
              type="date"
              value={form.scheduledDate}
              onChange={(event) => set("scheduledDate", event.target.value)}
              disabled={busy}
            />
          </Field>
        </div>
        <Field label="Message / consigne" required>
          <textarea
            value={form.content}
            onChange={(event) => set("content", event.target.value)}
            rows={5}
            required
            minLength={1}
            maxLength={4000}
            disabled={busy}
          />
        </Field>
        <Field label="État" required>
          <select
            value={form.status}
            onChange={(event) => set("status", event.target.value)}
            disabled={busy || item?.status === "consigne"}
          >
            <option value="brouillon">Brouillon</option>
            <option value="consigne">Contact fictif consigné</option>
          </select>
        </Field>
        <p className="muted-copy">
          « Consigné » signifie enregistré dans le dossier ; aucun e-mail, SMS
          ou courrier ne sera envoyé.
        </p>
        <FormError message={error} />
      </form>
    </Modal>
  );
}
