import { useRef, useState } from "react";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import { apiError } from "../../utils/errors.js";
import { notify } from "../../utils/notify.js";
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  danger = false,
  onCancel,
  onConfirm,
  loading = false,
}) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const confirm = async () => {
    if (lock.current || loading) return;
    lock.current = true;
    setBusy(true);
    try {
      await onConfirm();
    } catch (error) {
      notify(apiError(error), "error");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const pending = busy || loading;
  return (
    <Modal
      open={open}
      busy={pending}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" disabled={pending} onClick={onCancel}>
            Annuler
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={pending}
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="confirm-copy">{description}</p>
    </Modal>
  );
}
