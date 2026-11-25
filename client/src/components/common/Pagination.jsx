import { IconButton } from "./IconButton.jsx";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  return (
    <div className="pagination">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} sur{" "}
        {total}
      </span>
      <div>
        <IconButton
          label="Page précédente"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={17} />
        </IconButton>
        <span className="page-number">
          {page} / {pages}
        </span>
        <IconButton
          label="Page suivante"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={17} />
        </IconButton>
      </div>
    </div>
  );
}
