import { useState } from "react";
import { today } from "../../utils/format.js";
import { Modal } from "../../components/common/Modal.jsx";
import { Button } from "../../components/common/Button.jsx";
import { DateInput } from "../../components/common/DateInput.jsx";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function PromiseForm({ open, onClose, onSaved }) {
  const [date, setDate] = useState(today());
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Consigner une promesse de paiement"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => onSaved(date)}
            disabled={!date || date < today()}
          >
            Passer en promesse
          </Button>
        </>
      }
    >
      <DateInput
        label="Date promise"
        value={date}
        onChange={setDate}
        required
      />
      <p className="muted-copy">
        La date doit être aujourd’hui ou ultérieure. Aucun message n’est envoyé.
      </p>
    </Modal>
  );
}
