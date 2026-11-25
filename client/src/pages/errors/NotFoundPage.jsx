import { useLocation } from "wouter";
import { Button } from "../../components/common/Button.jsx";
import { ArrowRight } from "lucide-react";

// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function NotFoundPage() {
  const [, setLocation] = useLocation();
  return (
    <main className="not-found">
      <div className="not-found-mark">404</div>
      <p className="eyebrow">Page introuvable</p>
      <h1>Ce registre n’existe pas.</h1>
      <p>L’adresse demandée ne correspond à aucune section AssurRec.</p>
      <Button onClick={() => setLocation("/")}>
        Revenir à la vue d’ensemble <ArrowRight size={16} />
      </Button>
    </main>
  );
}
