import { useAuth } from "../../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { useList } from "../../hooks/useList.js";
import { useDebounced } from "../../hooks/useDebounced.js";
import { CrudPageLayout } from "../../layouts/CrudPageLayout.jsx";
import { Button } from "../../components/common/Button.jsx";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { TableState } from "../../components/common/TableState.jsx";
import { Link } from "wouter";
import { formatDate, formatTnd } from "../../utils/format.js";
import { Badge } from "../../components/common/Badge.jsx";
import {
  toneForPriority,
  priorityLabel,
  caseStatusLabel,
  insuranceLabel,
} from "../../constants/business.js";
import { StatusBadge } from "../../components/common/StatusBadge.jsx";
import { RowActions } from "../../components/common/RowActions.jsx";
import { IconButton } from "../../components/common/IconButton.jsx";
import { Pagination } from "../../components/common/Pagination.jsx";
import { CaseForm } from "./CaseForm.jsx";
import { ConfirmDialog } from "../../components/common/ConfirmDialog.jsx";
import { api, mutation } from "../../services/http.js";
import { notify } from "../../utils/notify.js";
import { apiError } from "../../utils/errors.js";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function CasesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [insuranceType, setInsuranceType] = useState("");
  const [agentId, setAgentId] = useState("");
  const [agents, setAgents] = useState([]);
  const debouncedSearch = useDebounced(search);
  const canCreate = user?.role === "admin" || user?.role === "manager";
  useEffect(() => {
    if (!canCreate) return;
    api
      .agents()
      .then(setAgents)
      .catch(() => setAgents([]));
  }, [canCreate]);
  const { result, loading, error, reload } = useList("/api/cases", {
    page,
    pageSize: 10,
    search: debouncedSearch,
    status,
    priority,
    insuranceType,
    agentId,
  });
  const canEdit = (item) => canCreate || item.agentId === user?.id;
  return (
    <>
      <CrudPageLayout
        page="Dossiers"
        description="File active de recouvrement, affectations et priorités d’action."
        search={search}
        onSearch={(v) => {
          setSearch(v);
          setPage(1);
        }}
        actions={
          canCreate && (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus size={16} /> Nouveau dossier
            </Button>
          )
        }
      >
        <div className="list-toolbar">
          <label className="field">
            <span className="field-label">État</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous les états</option>
              {Object.entries(caseStatusLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Priorité</span>
            <select
              value={priority}
              onChange={(event) => {
                setPriority(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Toutes</option>
              {Object.entries(priorityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Typologie</span>
            <select
              value={insuranceType}
              onChange={(event) => {
                setInsuranceType(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Toutes</option>
              {Object.entries(insuranceLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {canCreate && (
            <label className="field">
              <span className="field-label">Agent</span>
              <select
                value={agentId}
                onChange={(event) => {
                  setAgentId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tous</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <TableState
          loading={loading}
          error={error}
          items={result?.items || []}
          onRetry={reload}
          headers={[
            "Dossier",
            "Assuré / contrat",
            "Échéance",
            "Agent",
            "Priorité",
            "État",
            "Solde",
            "Actions",
          ]}
          emptyTitle="Aucun dossier"
          emptyDescription="Le backend ne remonte aucun dossier dans votre périmètre."
        >
          <>
            {result?.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link
                    className="reference text-link"
                    href={`/dossiers/${item.id}`}
                  >
                    {item.reference}
                  </Link>
                  <small className="table-sub">
                    Ouvert le {formatDate(item.openedAt)}
                  </small>
                </td>
                <td>
                  <strong>{item.insuredName}</strong>
                  <small className="table-sub">{item.contractReference}</small>
                </td>
                <td>{formatDate(item.dueDate)}</td>
                <td>{item.agentName || "Non affecté"}</td>
                <td>
                  <Badge tone={toneForPriority(item.priority)}>
                    {priorityLabel[item.priority]}
                  </Badge>
                </td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td className="money">
                  <strong>{formatTnd(item.balanceMilli)}</strong>
                </td>
                <td>
                  {canEdit(item) && (
                    <RowActions>
                      <IconButton
                        label={`Modifier ${item.reference}`}
                        onClick={() => {
                          setEditing(item);
                          setOpen(true);
                        }}
                      >
                        <Edit3 size={16} />
                      </IconButton>
                      {item.status === "nouveau" && (
                        <IconButton
                          label={`Supprimer ${item.reference}`}
                          onClick={() => setConfirm(item)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      )}
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
      <CaseForm
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
          if (!confirm || confirmBusy) return;
          setConfirmBusy(true);
          try {
            await mutation(`/api/cases/${confirm.id}`, "DELETE");
            notify("Dossier supprimé.");
            setConfirm(null);
            void reload();
          } catch (e) {
            notify(apiError(e), "error");
          } finally {
            setConfirmBusy(false);
          }
        }}
        title="Supprimer ce dossier ?"
        description="Seul un dossier nouveau sans opération associée peut être supprimé par le serveur."
        confirmLabel="Supprimer"
        danger
        loading={confirmBusy}
      />
    </>
  );
}
