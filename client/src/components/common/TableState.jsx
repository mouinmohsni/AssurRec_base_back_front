import { LoadingState } from "./LoadingState.jsx";
import { ErrorState } from "./ErrorState.jsx";
import { EmptyState } from "./EmptyState.jsx";
import { DataTable } from "./DataTable.jsx";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function TableState({
  loading,
  error,
  items,
  onRetry,
  children,
  headers,
  emptyTitle,
  emptyDescription,
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!items.length)
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return <DataTable headers={headers}>{children}</DataTable>;
}
