import { Field } from "./Field.jsx";
export function SelectField({
  label,
  value,
  onChange,
  options = [],
  required = false,
  error,
  help,
  children,
  placeholder = "Sélectionner…",
  ...props
}) {
  return (
    <Field label={label} required={required} error={error} help={help}>
      <select
        {...props}
        value={value ?? ""}
        required={required}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
    </Field>
  );
}
