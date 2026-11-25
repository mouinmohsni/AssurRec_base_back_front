import { AlertCircle } from "lucide-react";
import { Button } from "./Button.jsx";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card error-state" role="alert">
      <AlertCircle size={20} />
      <div>
        <strong>Impossible de charger cet écran</strong>
        <p>{message}</p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </div>
    </div>
  );
}
