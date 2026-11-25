import { useEffect, useId, useRef, useState } from "react";
import { api } from "../../services/http.js";
import { useApi } from "../../hooks/useApi.js";
import { useDebounced } from "../../hooks/useDebounced.js";
import { Field } from "./Field.jsx";
import { IconButton } from "./IconButton.jsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
const defaultLabel = (item) =>
  `${item.reference || item.name} · ${item.insuredName || item.name || ""}`;
const acceptAll = () => true;

/** Recherche paginée : aucune relation n'est limitée aux 100 premiers éléments. */
export function EntitySelect({
  label,
  resource,
  value,
  onChange,
  onSelect,
  required = false,
  disabled = false,
  enabled = true,
  params = {},
  filter = acceptAll,
  renderOption = defaultLabel,
  selectedItem = null,
  error,
  help,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(selectedItem);
  const [selectionError, setSelectionError] = useState("");
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const searchId = useId();
  const selectId = useId();
  const {
    data,
    loading,
    error: loadError,
    reload,
  } = useApi(
    resource,
    {
      ...params,
      page,
      pageSize: 10,
      search: useDebounced(search),
    },
    {
      enabled: enabled && !disabled,
    },
  );
  const rows = data?.items || [];
  const candidates = rows.filter(filter);

  // Une relation préselectionnée reste visible même si elle est sur une autre page.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      setSelectionError("");
      return;
    }
    if (selectedItem && String(selectedItem.id) === String(value)) {
      setSelected(selectedItem);
      onSelectRef.current?.(selectedItem);
      return;
    }
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;
    api
      .request(`${resource}/${encodeURIComponent(value)}`, {
        signal: controller.signal,
      })
      .then((item) => {
        if (!active) return;
        setSelected(item);
        setSelectionError("");
        onSelectRef.current?.(item);
      })
      .catch((reason) => {
        if (active && reason.name !== "AbortError")
          setSelectionError(reason.message);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [value, resource, enabled, selectedItem]);
  const options =
    selected &&
    !candidates.some((item) => String(item.id) === String(selected.id))
      ? [selected, ...candidates]
      : candidates;
  const pages = Math.max(1, Math.ceil((data?.total || 0) / 10));
  const choose = (id) => {
    const item = options.find((entry) => String(entry.id) === id) || null;
    setSelected(item);
    setSelectionError("");
    onChange(id);
    onSelectRef.current?.(item);
  };
  return (
    <div className="entity-select">
      {!disabled && (
        <div className="entity-search">
          <label className="sr-only" htmlFor={searchId}>
            Rechercher : {label}
          </label>
          <input
            id={searchId}
            type="search"
            value={search}
            placeholder={`Rechercher ${label.toLowerCase()}…`}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      )}
      <Field
        label={label}
        required={required}
        error={error || selectionError || loadError}
        help={
          help ||
          (!disabled
            ? "Recherche et sélection parmi les résultats paginés."
            : undefined)
        }
      >
        <select
          id={selectId}
          value={value || ""}
          required={required}
          disabled={disabled}
          onChange={(event) => choose(event.target.value)}
          aria-busy={loading}
        >
          <option value="">{loading ? "Chargement…" : "Sélectionner…"}</option>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {renderOption(item)}
            </option>
          ))}
        </select>
      </Field>
      {!disabled && (
        <div className="entity-pagination">
          <span>
            {loading
              ? "Chargement…"
              : `${candidates.length} résultat(s) admissible(s) · page ${page}/${pages}`}
          </span>
          <div>
            {loadError && (
              <button type="button" className="text-link" onClick={reload}>
                Réessayer
              </button>
            )}
            <IconButton
              label={`Résultats précédents : ${label}`}
              disabled={loading || page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} />
            </IconButton>
            <IconButton
              label={`Résultats suivants : ${label}`}
              disabled={loading || page >= pages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={14} />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}
