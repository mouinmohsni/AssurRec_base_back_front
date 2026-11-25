import { useCallback, useRef, useState } from "react";
import { ApiError } from "../services/http.js";
function normalizeFields(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, message]) => [key, String(message)]),
  );
}
function eventValue(value) {
  if (!value || typeof value !== "object" || !("target" in value)) return value;
  const target = value.target;
  if (target?.type === "checkbox") return Boolean(target.checked);
  return target?.value;
}
export function useMutationForm(initial = {}) {
  const initialRef = useRef(initial);
  const [form, setForm] = useState(initial);
  const [error, setErrorState] = useState(null);
  const [fields, setFieldsState] = useState({});
  const set = useCallback((fieldOrUpdater, value) => {
    if (typeof fieldOrUpdater === "function") {
      setForm(fieldOrUpdater);
      return;
    }
    if (fieldOrUpdater && typeof fieldOrUpdater === "object") {
      setForm((previous) => ({
        ...previous,
        ...fieldOrUpdater,
      }));
      return;
    }
    setForm((previous) => ({
      ...previous,
      [fieldOrUpdater]: eventValue(value),
    }));
  }, []);
  const setFields = useCallback((next) => {
    setFieldsState((previous) =>
      normalizeFields(typeof next === "function" ? next(previous) : next),
    );
  }, []);

  // Accepte directement une ApiError pour conserver ses messages de champs.
  const setError = useCallback(
    (next) => {
      if (next instanceof ApiError) {
        setErrorState(next.message || null);
        setFields(next.fields);
        return;
      }
      if (next && typeof next === "object") {
        setErrorState(next.message ? String(next.message) : null);
        setFields(next.fields);
        return;
      }
      setErrorState(next ? String(next) : null);
      if (!next) setFields({});
    },
    [setFields],
  );
  const reset = useCallback(
    (next = initialRef.current) => {
      setForm(next);
      setError(null);
      setFields({});
    },
    [setError, setFields],
  );
  return {
    form,
    set,
    error,
    setError,
    fields,
    setFields,
    reset,
  };
}
export default useMutationForm;
