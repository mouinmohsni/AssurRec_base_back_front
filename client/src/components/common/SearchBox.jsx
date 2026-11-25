import { Search, X } from "lucide-react";
import { IconButton } from "./IconButton.jsx";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function SearchBox({ value, onChange, placeholder = "Rechercher…" }) {
  return (
    <div className="search-box">
      <Search size={17} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <IconButton label="Effacer la recherche" onClick={() => onChange("")}>
          <X size={15} />
        </IconButton>
      )}
    </div>
  );
}
