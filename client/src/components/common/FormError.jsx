import { AlertCircle } from "lucide-react";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function FormError({ message }) {
  return message ? (
    <div className="form-error" role="alert">
      <AlertCircle size={16} />
      {message}
    </div>
  ) : null;
}
