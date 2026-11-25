import { useEffect, useState } from "react";
import { useMutationForm } from "../../hooks/useMutationForm.js";
import { mutation } from "../../services/http.js";
import { notify } from "../../utils/notify.js";
import { apiError } from "../../utils/errors.js";
import { Modal } from "../../components/common/Modal.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Fieldset } from "../../components/common/Fieldset.jsx";
import { Field } from "../../components/common/Field.jsx";
import { FormError } from "../../components/common/FormError.jsx";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function InsuredForm({ open, item, onClose, onSaved }) {
  const form = useMutationForm({
    reference: item?.reference || "",
    name: item?.name || "",
    email: item?.email || "",
    phone: item?.phone || "",
    address: item?.address || "",
    active: item?.active ?? true,
  });
  const { reset } = form;
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    reset({
      reference: item?.reference || "",
      name: item?.name || "",
      email: item?.email || "",
      phone: item?.phone || "",
      address: item?.address || "",
      active: item?.active ?? true,
    });
  }, [item, open, reset]);
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const values = {
      reference: form.form.reference.trim(),
      name: form.form.name.trim(),
      email: form.form.email.trim(),
      phone: form.form.phone.trim(),
      address: form.form.address.trim(),
      active: Boolean(form.form.active),
    };
    const fields = {};
    if (!values.reference || values.reference.length > 60)
      fields.reference =
        "La référence est obligatoire (60 caractères maximum).";
    if (!values.name || values.name.length > 160)
      fields.name = "Le nom est obligatoire (160 caractères maximum).";
    if (
      !values.email ||
      values.email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(values.email)
    )
      fields.email =
        "Saisissez une adresse e-mail valide (254 caractères maximum).";
    if (values.phone.length < 3 || values.phone.length > 40)
      fields.phone = "Le téléphone doit comporter entre 3 et 40 caractères.";
    if (!values.address || values.address.length > 255)
      fields.address = "L’adresse est obligatoire (255 caractères maximum).";
    if (Object.keys(fields).length) {
      form.setError({
        message: "Vérifiez les champs indiqués.",
        fields,
      });
      return;
    }
    setBusy(true);
    try {
      if (item) await mutation(`/api/insureds/${item.id}`, "PUT", values);
      else await mutation("/api/insureds", "POST", values);
      notify(item ? "Assuré mis à jour." : "Assuré créé.");
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
      title={item ? "Modifier l’assuré" : "Nouvel assuré"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Annuler
          </Button>
          <Button type="submit" form="insured-form" loading={busy}>
            {item ? "Enregistrer" : "Créer l’assuré"}
          </Button>
        </>
      }
    >
      <form id="insured-form" onSubmit={submit}>
        <Fieldset title="Identité et contact">
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
            <Field label="Nom complet" required error={form.fields.name}>
              <input
                value={form.form.name}
                onChange={(event) => form.set("name", event.target.value)}
                required
                minLength={1}
                maxLength={160}
                disabled={busy}
              />
            </Field>
            <Field label="E-mail" required error={form.fields.email}>
              <input
                type="email"
                value={form.form.email}
                onChange={(event) => form.set("email", event.target.value)}
                required
                maxLength={254}
                disabled={busy}
              />
            </Field>
            <Field label="Téléphone" required error={form.fields.phone}>
              <input
                value={form.form.phone}
                onChange={(event) => form.set("phone", event.target.value)}
                required
                minLength={3}
                maxLength={40}
                disabled={busy}
              />
            </Field>
            <Field label="Adresse" required error={form.fields.address}>
              <textarea
                value={form.form.address}
                onChange={(event) => form.set("address", event.target.value)}
                required
                minLength={1}
                maxLength={255}
                rows={3}
                disabled={busy}
              />
            </Field>
            <label className="check-field">
              <input
                type="checkbox"
                checked={form.form.active}
                onChange={(event) => form.set("active", event.target.checked)}
                disabled={busy}
              />{" "}
              Dossier actif
            </label>
          </div>
        </Fieldset>
        <FormError message={form.error} />
      </form>
    </Modal>
  );
}
