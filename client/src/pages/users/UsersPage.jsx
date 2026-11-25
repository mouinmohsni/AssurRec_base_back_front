import { useState } from "react";
import { useList } from "../../hooks/useList.js";
import { useDebounced } from "../../hooks/useDebounced.js";
import { CrudPageLayout } from "../../layouts/CrudPageLayout.jsx";
import { Button } from "../../components/common/Button.jsx";
import { UserPlus, Edit3, Trash2 } from "lucide-react";
import { TableState } from "../../components/common/TableState.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import { roleLabel } from "../../constants/business.js";
import { formatDate } from "../../utils/format.js";
import { RowActions } from "../../components/common/RowActions.jsx";
import { IconButton } from "../../components/common/IconButton.jsx";
import { Pagination } from "../../components/common/Pagination.jsx";
import { UserForm } from "./UserForm.jsx";
import { ConfirmDialog } from "../../components/common/ConfirmDialog.jsx";
import { mutation } from "../../services/http.js";
import { notify } from "../../utils/notify.js";
import { apiError } from "../../utils/errors.js";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function UsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { result, loading, error, reload } = useList("/api/users", {
    page,
    pageSize: 10,
    search: useDebounced(search),
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  return (
    <>
      <CrudPageLayout
        page="Utilisateurs"
        description="Comptes et rôles internes, réservés aux administrateurs."
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
            <UserPlus size={16} /> Nouvel utilisateur
          </Button>
        }
      >
        <TableState
          loading={loading}
          error={error}
          items={result?.items || []}
          onRetry={reload}
          headers={[
            "Utilisateur",
            "E-mail",
            "Rôle",
            "État",
            "Création",
            "Actions",
          ]}
          emptyTitle="Aucun utilisateur"
          emptyDescription="Les comptes gérés par l’administration apparaîtront ici."
        >
          <>
            {result?.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.name}</strong>
                </td>
                <td>{item.email}</td>
                <td>
                  <Badge tone="teal">{roleLabel[item.role]}</Badge>
                </td>
                <td>
                  <Badge tone={item.active ? "green" : "neutral"}>
                    {item.active ? "Actif" : "Désactivé"}
                  </Badge>
                </td>
                <td>{formatDate(item.createdAt)}</td>
                <td>
                  <RowActions>
                    <IconButton
                      label={`Modifier ${item.name}`}
                      onClick={() => {
                        setEditing(item);
                        setOpen(true);
                      }}
                    >
                      <Edit3 size={16} />
                    </IconButton>
                    <IconButton
                      label={`D\xE9sactiver ${item.name}`}
                      onClick={() => setConfirm(item)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </RowActions>
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
      <UserForm
        open={open}
        item={editing}
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
          if (!confirm) return;
          try {
            await mutation(`/api/users/${confirm.id}`, "DELETE");
            notify("Utilisateur désactivé.");
            setConfirm(null);
            void reload();
          } catch (e) {
            notify(apiError(e), "error");
          }
        }}
        title="Désactiver cet utilisateur ?"
        description="Le serveur conserve le compte et son historique ; une réaffectation peut être requise."
        confirmLabel="Désactiver"
        danger
      />
    </>
  );
}
