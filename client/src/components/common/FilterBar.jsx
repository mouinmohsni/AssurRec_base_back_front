import { SlidersHorizontal } from "lucide-react";
import { Button } from "./Button.jsx";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function FilterBar({ children, onReset }) {
  return (
    <div className="filter-bar">
      <div className="filter-icon">
        <SlidersHorizontal size={16} />
      </div>
      <div className="filter-fields">{children}</div>
      {onReset && (
        <Button variant="ghost" onClick={onReset}>
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
