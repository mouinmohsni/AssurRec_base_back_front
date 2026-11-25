import { useEffect, useState } from "react";
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  const normalizedDelay = Math.max(0, Number(delay) || 0);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), normalizedDelay);
    return () => clearTimeout(timer);
  }, [value, normalizedDelay]);
  return debounced;
}
export default useDebounced;
