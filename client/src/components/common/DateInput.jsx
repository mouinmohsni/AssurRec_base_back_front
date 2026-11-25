import { Field } from "./Field.jsx";
export function DateInput({
  label,
  value,
  onChange,
  required = false,
  error,
  help,
  ...props
}) {
  return (
    <Field label={label} required={required} error={error} help={help}>
      <input
        {...props}
        type="date"
        value={value || ""}
        required={required}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
