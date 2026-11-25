import { useState } from "react";
import { useList } from "../../hooks/useList.js";
import { useDebounced } from "../../hooks/useDebounced.js";
import { CrudPageLayout } from "../../layouts/CrudPageLayout.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Plus } from "lucide-react";
import { TableState } from "../../components/common/TableState.jsx";
import { reminderChannelLabel } from "../../constants/business.js";
import { formatDate } from "../../utils/format.js";
import { Badge } from "../../components/common/Badge.jsx";
import { ReminderActions } from "./ReminderActions.jsx";
import { Pagination } from "../../components/common/Pagination.jsx";
import { ReminderForm } from "./ReminderForm.jsx";
import { ConfirmDialog } from "../../components/common/ConfirmDialog.jsx";
import { mutation } from "../../services/http.js";
import { notify } from "../../utils/notify.js";
import { apiError } from "../../utils/errors.js";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function RemindersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { result, loading, error, reload } = useList("/api/reminders", {
    page,
    pageSize: 10,
    search: useDebounced(search),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  return (
    <>
      <CrudPageLayout
        page="Relances"
        description="Contacts fictifs consignés et brouillons, sans envoi externe."
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Nouvelle relance
          </Button>
        }
      >
        <TableState
          loading={loading}
          error={error}
          items={result?.items || []}
          onRetry={reload}
          headers={[
            "Dossier / assuré",
            "Objet",
            "Canal",
            "Planification",
            "État",
            "Créé par",
            "Actions",
          ]}
          emptyTitle="Aucune relance"
          emptyDescription="Consignez un contact fictif depuis un dossier non clôturé."
        >
          <>
            {result?.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.caseReference}</strong>
                  <small className="table-sub">{item.insuredName}</small>
                </td>
                <td>{item.subject}</td>
                <td>{reminderChannelLabel[item.channel]}</td>
                <td>
                  {item.scheduledDate
                    ? formatDate(item.scheduledDate)
                    : "Sans date"}
                </td>
                <td>
                  <Badge tone={item.status === "consigne" ? "green" : "amber"}>
                    {item.status === "consigne"
                      ? "Contact fictif consigné"
                      : "Brouillon"}
                  </Badge>
                </td>
                <td>{item.createdByName}</td>
                <td>
                  <ReminderActions
                    item={item}
                    onEdit={(selected) => {
                      setEditing(selected);
                      setOpen(true);
                    }}
                    onDelete={setConfirm}
                  />
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
      <ReminderForm
        open={open}
        item={editing}
        caseId={editing?.caseId}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          void reload();
        }}
      />
      <ConfirmDialog
        open={!!confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm || confirmBusy) return;
          setConfirmBusy(true);
          try {
            await mutation(`/api/reminders/${confirm.id}`, "DELETE");
            notify("Brouillon supprimé.");
            setConfirm(null);
            void reload();
          } catch (e) {
            notify(apiError(e), "error");
          } finally {
            setConfirmBusy(false);
          }
        }}
        title="Supprimer le brouillon ?"
        description="Une relance consignée est immuable. Seuls les brouillons peuvent être supprimés."
        confirmLabel="Supprimer"
        danger
        loading={confirmBusy}
      />
    </>
  );
}
