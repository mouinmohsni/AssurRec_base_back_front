import { useState } from "react";
import { useApi } from "../../hooks/useApi.js";
import { useDebounced } from "../../hooks/useDebounced.js";
import { CrudPageLayout } from "../../layouts/CrudPageLayout.jsx";
import { TableState } from "../../components/common/TableState.jsx";
import { FilterBar } from "../../components/common/FilterBar.jsx";
import { Badge } from "../../components/common/Badge.jsx";
import { Pagination } from "../../components/common/Pagination.jsx";
import { formatDateTime } from "../../utils/format.js";
import { roleLabel } from "../../constants/business.js";
export function AuditPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entityType, setEntityType] = useState("");
  const periodError =
    from && to && from > to
      ? "La date de début doit précéder la date de fin."
      : "";
  const {
    data: result,
    loading,
    error,
    reload,
  } = useApi(
    "/api/audit",
    {
      page,
      pageSize: 20,
      search: useDebounced(search),
      from,
      to,
      entityType,
    },
    {
      enabled: !periodError,
    },
  );
  const update = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };
  const reset = () => {
    setFrom("");
    setTo("");
    setEntityType("");
    setPage(1);
  };
  return (
    <CrudPageLayout
      page="Journal d’audit"
      description="Trace append-only des actions sensibles, consultable par gestionnaires et administrateurs."
      search={search}
      onSearch={(value) => {
        setSearch(value);
        setPage(1);
      }}
    >
      <FilterBar onReset={reset}>
        <label>
          Du
          <input type="date" value={from} onChange={update(setFrom)} />
        </label>
        <label>
          Au
          <input type="date" value={to} onChange={update(setTo)} />
        </label>
        <label>
          Ressource
          <input
            value={entityType}
            maxLength={50}
            placeholder="Ex. payment"
            onChange={update(setEntityType)}
          />
        </label>
      </FilterBar>
      <TableState
        loading={loading && !periodError}
        error={periodError || error}
        items={result?.items || []}
        onRetry={reload}
        headers={["Moment", "Acteur", "Action", "Ressource", "Détails"]}
        emptyTitle="Aucun événement"
        emptyDescription="Le serveur ne remonte aucun événement sur ce périmètre."
      >
        {(result?.items || []).map((item) => (
          <tr key={item.id}>
            <td>{formatDateTime(item.createdAt)}</td>
            <td>
              <strong>{item.actorName}</strong>
              <small className="table-sub">{roleLabel[item.actorRole]}</small>
            </td>
            <td>
              <Badge tone="blue">{item.action}</Badge>
            </td>
            <td>
              {item.entityType}
              {item.entityId ? ` #${item.entityId}` : ""}
            </td>
            <td className="cell-truncate">{item.details || "—"}</td>
          </tr>
        ))}
      </TableState>
      {!periodError && !error && (
        <Pagination
          page={page}
          pageSize={result?.pageSize || 20}
          total={result?.total || 0}
          onChange={setPage}
        />
      )}
    </CrudPageLayout>
  );
}
