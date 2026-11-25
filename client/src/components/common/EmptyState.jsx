import { BookOpen } from "lucide-react";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function EmptyState({ title, description, action }) {
  return (
    <div className="state-card empty-state">
      <BookOpen size={25} />
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
