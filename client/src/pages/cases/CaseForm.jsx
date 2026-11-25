import { useState, useEffect } from "react";
import { api, mutation } from "../../services/http.js";
import { apiError } from "../../utils/errors.js";
import { notify } from "../../utils/notify.js";
import { Modal } from "../../components/common/Modal.jsx";
import { Button } from "../../components/common/Button.jsx";
import { EntitySelect } from "../../components/common/EntitySelect.jsx";
import { formatTnd, today } from "../../utils/format.js";
import { priorityLabel } from "../../constants/business.js";
import { canManage } from "../../constants/navigation.js";
import { Field } from "../../components/common/Field.jsx";
import { FormError } from "../../components/common/FormError.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
function previousDate() {
  const date = new Date(`${today()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
export function CaseForm({ open, item, onClose, onSaved }) {
  const { user } = useAuth();
  const manager = canManage(user);
  const [agents, setAgents] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [agentError, setAgentError] = useState("");
  const [form, setForm] = useState({
    installmentId: String(item?.installmentId || ""),
    agentId: item?.agentId ? String(item.agentId) : "",
    priority: item?.priority || "normale",
    notes: item?.notes || "",
  });
  useEffect(() => {
    setForm({
      installmentId: String(item?.installmentId || ""),
      agentId: item?.agentId ? String(item.agentId) : "",
      priority: item?.priority || "normale",
      notes: item?.notes || "",
    });
    setError("");
    setAgentError("");
    if (!open || !manager) return;
    api
      .agents()
      .then(setAgents)
      .catch((reason) => setAgentError(apiError(reason)));
  }, [open, item, manager]);
  const set = (key, value) =>
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  const submit = async (event) => {
    event.preventDefault();
    if (!item && !form.installmentId) {
      setError("Sélectionnez une échéance dépassée avec un solde positif.");
      return;
    }
    if (agentError) return;
    setBusy(true);
    try {
      if (item) {
        const body = {
          priority: form.priority,
          notes: form.notes,
        };
        if (manager) body.agentId = form.agentId ? Number(form.agentId) : null;
        await mutation(`/api/cases/${item.id}`, "PUT", body);
      } else {
        await mutation("/api/cases", "POST", {
          installmentId: Number(form.installmentId),
          agentId: form.agentId ? Number(form.agentId) : null,
          priority: form.priority,
          notes: form.notes,
        });
      }
      notify(item ? "Dossier mis à jour." : "Dossier créé.");
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
      onClose={onClose}
      title={item ? "Modifier le dossier" : "Nouveau dossier"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="case-form" loading={busy}>
            {item ? "Enregistrer" : "Créer le dossier"}
          </Button>
        </>
      }
    >
      <form id="case-form" onSubmit={submit}>
        <div className="form-grid">
          {!item && (
            <EntitySelect
              label="Échéance dépassée avec solde"
              resource="/api/installments"
              value={form.installmentId}
              onChange={(value) => set("installmentId", value)}
              required
              enabled={open}
              params={{
                to: previousDate(),
              }}
              filter={(installment) =>
                installment.balanceMilli > 0 && installment.dueDate < today()
              }
              renderOption={(installment) =>
                `${installment.reference} · ${installment.insuredName} · ${formatTnd(installment.balanceMilli)}`
              }
              help="Seules les échéances dépassées et encore dues peuvent ouvrir un dossier."
            />
          )}
          <Field
            label="Agent affecté"
            help={
              !manager
                ? "Seuls les managers et administrateurs peuvent affecter un dossier."
                : agentError || undefined
            }
          >
            <select
              value={form.agentId}
              onChange={(event) => set("agentId", event.target.value)}
              disabled={!manager || Boolean(agentError) || busy}
            >
              <option value="">Non affecté</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priorité" required>
            <select
              value={form.priority}
              onChange={(event) => set("priority", event.target.value)}
              disabled={busy}
            >
              {Object.entries(priorityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            rows={5}
            value={form.notes}
            onChange={(event) => set("notes", event.target.value)}
            placeholder="Contexte et prochaine action"
            maxLength={2000}
            disabled={busy}
          />
        </Field>
        <FormError message={error || agentError} />
      </form>
    </Modal>
  );
}
