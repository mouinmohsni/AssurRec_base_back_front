// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function Kpi({ label, value, note, icon }) {
  return (
    <article className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
