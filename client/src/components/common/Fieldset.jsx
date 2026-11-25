// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function Fieldset({ title, children }) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}
