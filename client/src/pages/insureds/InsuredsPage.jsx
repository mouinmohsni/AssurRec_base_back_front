import { useAuth } from "../../context/AuthContext.jsx";
import { useState } from "react";
import { useDebounced } from "../../hooks/useDebounced.js";
import { useList } from "../../hooks/useList.js";
import { CrudPageLayout } from "../../layouts/CrudPageLayout.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { TableState } from "../../components/common/TableState.jsx";
import { formatDate } from "../../utils/format.js";
import { Badge } from "../../components/common/Badge.jsx";
import { RowActions } from "../../components/common/RowActions.jsx";
import { IconButton } from "../../components/common/IconButton.jsx";
import { Pagination } from "../../components/common/Pagination.jsx";
import { InsuredForm } from "./InsuredForm.jsx";
import { ConfirmDialog } from "../../components/common/ConfirmDialog.jsx";
import { mutation } from "../../services/http.js";
import { notify } from "../../utils/notify.js";
import { apiError } from "../../utils/errors.js";
import { canManage } from "../../constants/navigation.js";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function InsuredsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);
  const { result, loading, error, reload } = useList("/api/insureds", {
    page,
    pageSize: 10,
    search: debouncedSearch,
  });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const open = (item) => {
    setEditing(item || null);
    setModal(true);
  };
  const manageable = canManage(user);
  const confirmDelete = async () => {
    if (!confirm || confirmBusy) return;
    setConfirmBusy(true);
    try {
      await mutation(`/api/insureds/${confirm.id}`, "DELETE");
      notify("Assuré supprimé ou archivé.");
      setConfirm(null);
      reload();
    } catch (e) {
      notify(apiError(e), "error");
    } finally {
      setConfirmBusy(false);
    }
  };
  return (
    <>
      <CrudPageLayout
        page="Assurés"
        description="Référentiel des personnes assurées et coordonnées de contact."
        search={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        actions={
          manageable && (
            <Button onClick={() => open()}>
              <Plus size={16} /> Nouvel assuré
            </Button>
          )
        }
      >
        <TableState
          loading={loading}
          error={error}
          items={result?.items || []}
          onRetry={reload}
          headers={[
            "Référence",
            "Assuré",
            "Contact",
            "Adresse",
            "État",
            "Actions",
          ]}
          emptyTitle="Aucun assuré trouvé"
          emptyDescription="Ajustez la recherche ou créez un premier dossier assuré."
        >
          <>
            {result?.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="reference">{item.reference}</span>
                </td>
                <td>
                  <strong>{item.name}</strong>
                  <small className="table-sub">
                    Ajouté le {formatDate(item.createdAt)}
                  </small>
                </td>
                <td>
                  {item.email}
                  <small className="table-sub">
                    {item.phone || "Téléphone non renseigné"}
                  </small>
                </td>
                <td className="cell-truncate">{item.address || "—"}</td>
                <td>
                  <Badge tone={item.active ? "green" : "neutral"}>
                    {item.active ? "Actif" : "Archivé"}
                  </Badge>
                </td>
                <td>
                  {manageable && (
                    <RowActions>
                      <IconButton
                        label={`Modifier ${item.name}`}
                        onClick={() => open(item)}
                      >
                        <Edit3 size={16} />
                      </IconButton>
                      <IconButton
                        label={`Supprimer ${item.name}`}
                        onClick={() => setConfirm(item)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </RowActions>
                  )}
                </td>
              </tr>
            ))}
          </>
        </TableState>
        <Pagination
          page={page}
          pageSize={result?.pageSize || 10}
          total={result?.total || 0}
          onChange={setPage}
        />
      </CrudPageLayout>
      <InsuredForm
        open={modal}
        item={editing}
        onClose={() => setModal(false)}
        onSaved={() => {
          setModal(false);
          reload();
        }}
      />
      <ConfirmDialog
        open={!!confirm}
        onCancel={() => {
          if (!confirmBusy) setConfirm(null);
        }}
        onConfirm={confirmDelete}
        loading={confirmBusy}
        title="Supprimer cet assuré ?"
        description="La suppression est refusée par le serveur si une relation historique existe ; l’archivage reste possible depuis le formulaire."
        confirmLabel="Confirmer"
        danger
      />
    </>
  );
}
