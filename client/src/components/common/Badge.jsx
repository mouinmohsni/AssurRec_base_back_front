// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function Badge({ children, tone = "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
