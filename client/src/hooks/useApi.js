import { useCallback, useEffect, useRef, useState } from "react";
import { api, query } from "../services/http.js";
function stableKey(value) {
  if (!value || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableKey).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableKey(value[key])}`)
    .join(",")}}`;
}
export function useApi(url, params = {}, { enabled = true } = {}) {
  const [state, setState] = useState({
    path: null,
    data: null,
    error: null,
    loading: Boolean(enabled),
  });
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(0);
  const paramsKey = stableKey(params);
  const paramsSnapshotRef = useRef({
    key: null,
    value: params,
  });
  if (paramsSnapshotRef.current.key !== paramsKey)
    paramsSnapshotRef.current = {
      key: paramsKey,
      value: params,
    };
  const requestPath = query(url, paramsSnapshotRef.current.value);
  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestRef.current;
    let active = true;
    if (!enabled)
      return () => {
        active = false;
        controller.abort();
      };
    setState((previous) => ({
      path: requestPath,
      data: previous.path === requestPath ? previous.data : null,
      error: null,
      loading: true,
    }));
    api
      .request(requestPath, {
        signal: controller.signal,
      })
      .then((data) => {
        if (active && requestId === requestRef.current)
          setState({
            path: requestPath,
            data,
            error: null,
            loading: false,
          });
      })
      .catch((reason) => {
        if (
          !active ||
          requestId !== requestRef.current ||
          reason?.name === "AbortError"
        )
          return;
        setState({
          path: requestPath,
          data: null,
          error:
            reason instanceof Error ? reason.message : "Erreur de chargement",
          loading: false,
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [requestPath, enabled, reloadKey]);

  // Une ancienne réponse n'est jamais présentée comme la nouvelle ressource.
  if (!enabled)
    return {
      data: null,
      error: null,
      loading: false,
      reload,
    };
  if (state.path !== requestPath)
    return {
      data: null,
      error: null,
      loading: true,
      reload,
    };
  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    reload,
  };
}
export default useApi;
