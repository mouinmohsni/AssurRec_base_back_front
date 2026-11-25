import { Edit3, Trash2 } from "lucide-react";
import { useApi } from "../../hooks/useApi.js";
import { RowActions } from "../../components/common/RowActions.jsx";
import { IconButton } from "../../components/common/IconButton.jsx";

/** Le DTO de relance n'expose pas le statut du dossier : lecture ciblée avant action. */
export function ReminderActions({ item, onEdit, onDelete }) {
  const {
    data: recoveryCase,
    loading,
    error,
    reload,
  } = useApi(
    `/api/cases/${item.caseId}`,
    {},
    {
      enabled: item.status === "brouillon",
    },
  );
  if (item.status !== "brouillon")
    return <small className="muted-copy">Contact consigné : immuable</small>;
  if (loading)
    return (
      <small className="muted-copy" role="status">
        Vérification du dossier…
      </small>
    );
  if (error)
    return (
      <button
        type="button"
        className="text-link"
        title={error}
        onClick={reload}
      >
        Vérifier à nouveau le dossier
      </button>
    );
  if (recoveryCase?.status === "cloture")
    return (
      <small className="muted-copy">
        Dossier clôturé : relance verrouillée
      </small>
    );
  if (!recoveryCase)
    return <small className="muted-copy">Dossier indisponible</small>;
  return (
    <RowActions>
      <IconButton
        label={`Modifier ${item.subject}`}
        onClick={() => onEdit(item)}
      >
        <Edit3 size={16} />
      </IconButton>
      <IconButton
        label={`Supprimer ${item.subject}`}
        onClick={() => onDelete(item)}
      >
        <Trash2 size={16} />
      </IconButton>
    </RowActions>
  );
}
