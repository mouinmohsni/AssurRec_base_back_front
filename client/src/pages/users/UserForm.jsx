import { useEffect, useState } from "react";
import { mutation } from "../../services/http.js";
import { notify } from "../../utils/notify.js";
import { apiError } from "../../utils/errors.js";
import { roleLabel } from "../../constants/business.js";
import { Modal } from "../../components/common/Modal.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Field } from "../../components/common/Field.jsx";
import { SelectField } from "../../components/common/SelectField.jsx";
import { FormError } from "../../components/common/FormError.jsx";
export function UserForm({ open, item, onClose, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "agent",
    password: "",
    active: true,
  });
  useEffect(() => {
    setForm({
      name: item?.name || "",
      email: item?.email || "",
      role: item?.role || "agent",
      password: "",
      active: item?.active ?? true,
    });
    setError("");
  }, [item, open]);
  const set = (key, value) =>
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if ((!item || form.password) && form.password.length < 12) {
      setError("Le mot de passe doit contenir au moins 12 caractères.");
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.role) {
      setError("Complétez les champs obligatoires.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        password: item && !form.password ? undefined : form.password,
      };
      await mutation(
        item ? `/api/users/${item.id}` : "/api/users",
        item ? "PUT" : "POST",
        body,
      );
      notify(item ? "Utilisateur mis à jour." : "Utilisateur créé.");
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
      title={item ? "Modifier l’utilisateur" : "Nouvel utilisateur"}
      footer={
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="user-form" loading={busy}>
            {item ? "Enregistrer" : "Créer le compte"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit}>
        <fieldset className="mutation-fields" disabled={busy}>
          <div className="form-grid">
            <Field label="Nom" required>
              <input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                maxLength={160}
                required
              />
            </Field>
            <Field label="E-mail" required>
              <input
                type="email"
                value={form.email}
                onChange={(event) => set("email", event.target.value)}
                maxLength={254}
                required
              />
            </Field>
            <SelectField
              label="Rôle"
              value={form.role}
              onChange={(value) => set("role", value)}
              required
              options={Object.entries(roleLabel).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Field
              label={item ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
              required={!item}
              help="12 à 200 caractères ; vide en édition pour conserver le mot de passe."
            >
              <input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => set("password", event.target.value)}
                minLength={12}
                maxLength={200}
                required={!item}
              />
            </Field>
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => set("active", event.target.checked)}
            />
            Compte actif
          </label>
        </fieldset>
        <FormError message={error} />
      </form>
    </Modal>
  );
}
