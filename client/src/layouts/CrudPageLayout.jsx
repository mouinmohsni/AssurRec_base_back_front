import { PageHeader } from "../components/common/PageHeader.jsx";
import { SearchBox } from "../components/common/SearchBox.jsx";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function CrudPageLayout({
  children,
  page,
  search,
  onSearch,
  actions,
  description,
}) {
  return (
    <>
      <PageHeader
        eyebrow={`Registre / ${page}`}
        title={page}
        description={description}
        actions={actions}
      />
      {onSearch && (
        <div className="list-toolbar">
          <SearchBox value={search || ""} onChange={onSearch} />
          <span className="toolbar-hint">
            Recherche serveur · saisie progressive
          </span>
        </div>
      )}
      {children}
    </>
  );
}
