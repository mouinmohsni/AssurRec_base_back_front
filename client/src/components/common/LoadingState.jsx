// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function LoadingState({ label = "Chargement des données…" }) {
  return (
    <div className="state-card loading-state" role="status">
      <span className="spinner spinner-dark" /> <span>{label}</span>
    </div>
  );
}
