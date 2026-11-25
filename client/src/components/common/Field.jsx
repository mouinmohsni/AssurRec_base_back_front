// Composant de l'interface AssurRec, séparé pour simplifier maintenance et tests.
export function Field({ label, required, error, help, children }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      {children}
      {help && <small className="field-help">{help}</small>}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
