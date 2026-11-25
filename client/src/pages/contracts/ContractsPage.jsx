import { useAuth } from "../../context/AuthContext.jsx";
import { useState } from "react";
import { useList } from "../../hooks/useList.js";
import { useDebounced } from "../../hooks/useDebounced.js";
import { CrudPageLayout } from "../../layouts/CrudPageLayout.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { TableState } from "../../components/common/TableState.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import { insuranceLabel } from "../../constants/business.js";
import { formatDate } from "../../utils/format.js";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { RowActions } from "../../components/common/RowActions.jsx";
import { IconButton } from "../../components/common/IconButton.jsx";
import { Pagination } from "../../components/common/Pagination.jsx";
import { ContractForm } from "./ContractForm.jsx";
import { ConfirmDialog } from "../../components/common/ConfirmDialog.jsx";
import { mutation } from "../../services/http.js";
import { notify } from "../../utils/notify.js";
import { apiError } from "../../utils/errors.js";
import { canManage } from "../../constants/navigation.js";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function ContractsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounced(search);
  const { result, loading, error, reload } = useList("/api/contracts", {
    page,
    pageSize: 10,
    search: debouncedSearch,
  });
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const manageable = canManage(user);
  const confirmDelete = async () => {
    if (!confirm || confirmBusy) return;
    setConfirmBusy(true);
    try {
      await mutation(`/api/contracts/${confirm.id}`, "DELETE");
      notify("Contrat supprimé ou archivé.");
      setConfirm(null);
      reload();
    } catch (errorReason) {
      notify(apiError(errorReason), "error");
    } finally {
      setConfirmBusy(false);
    }
  };
  return (
    <>
      <CrudPageLayout
        page="Contrats"
        description="Polices et conventions d’assurance rattachées à un assuré."
        search={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        actions={
          manageable && (
            <Button
              onClick={() => {
                setEditing(null);
                setModal(true);
              }}
            >
              <Plus size={16} /> Nouveau contrat
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
            "Type",
            "Période",
            "État",
            "Actions",
          ]}
          emptyTitle="Aucun contrat trouvé"
          emptyDescription="Les contrats apparaîtront ici une fois créés par un gestionnaire."
        >
          <>
            {result?.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="reference">{item.reference}</span>
                </td>
                <td>
                  <strong>{item.insuredName}</strong>
                </td>
                <td>
                  <Badge tone="teal">
                    {insuranceLabel[item.insuranceType]}
                  </Badge>
                </td>
                <td>
                  {formatDate(item.startDate)}
                  <small className="table-sub">
                    au {formatDate(item.endDate)}
                  </small>
                </td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td>
                  {manageable && (
                    <RowActions>
                      <IconButton
                        label={`Modifier ${item.reference}`}
                        onClick={() => {
                          setEditing(item);
                          setModal(true);
                        }}
                      >
                        <Edit3 size={16} />
                      </IconButton>
                      <IconButton
                        label={`Supprimer ${item.reference}`}
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
      <ContractForm
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
        title="Supprimer ce contrat ?"
        description="Le serveur refuse la suppression si des échéances existent."
        confirmLabel="Supprimer"
        danger
      />
    </>
  );
}
