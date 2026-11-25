import { useState } from "react";
import { mutation } from "../../services/http.js";
import { notify } from "../../utils/notify.js";
import { apiError } from "../../utils/errors.js";
import { Button } from "../../components/common/Button.jsx";
import { RotateCcw } from "lucide-react";
import { Modal } from "../../components/common/Modal.jsx";
import { Field } from "../../components/common/Field.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { canManage } from "../../constants/navigation.js";
export function ReversePayment({ payment, onDone }) {
  const { user } = useAuth();
  const allowed = canManage(user);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const normalizedReason = reason.trim();
  const close = () => {
    if (!busy) setOpen(false);
  };
  const submit = async () => {
    if (normalizedReason.length < 3 || normalizedReason.length > 500 || busy)
      return;
    setBusy(true);
    try {
      await mutation(`/api/payments/${payment.id}/reverse`, "POST", {
        reason: normalizedReason,
      });
      notify("Paiement annulé et historique conservé.");
      setOpen(false);
      onDone();
    } catch (error) {
      notify(apiError(error), "error");
    } finally {
      setBusy(false);
    }
  };
  if (!allowed)
    return (
      <span className="muted-copy">
        Réservé aux managers et administrateurs
      </span>
    );
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} disabled={busy}>
        <RotateCcw size={14} /> Annuler
      </Button>
      <Modal
        open={open}
        onClose={close}
        title="Annuler le paiement"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Retour
            </Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={
                normalizedReason.length < 3 || normalizedReason.length > 500
              }
              onClick={submit}
            >
              Confirmer l’annulation
            </Button>
          </>
        }
      >
        <p className="confirm-copy">
          Cette correction est tracée et le solde sera recalculé par le serveur.
        </p>
        <Field label="Motif obligatoire" required help="3 à 500 caractères.">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            minLength={3}
            maxLength={500}
            required
            disabled={busy}
          />
        </Field>
      </Modal>
    </>
  );
}
