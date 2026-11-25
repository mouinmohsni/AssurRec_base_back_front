import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiError, api } from "../services/http.js";
const AuthContext = createContext(null);
function errorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);
  const operationRef = useRef(0);
  const refresh = useCallback(async ({ initial = false } = {}) => {
    const operation = ++operationRef.current;
    setLoading(true);
    try {
      const nextUser = await api.me({
        initial,
      });
      if (!mountedRef.current || operation !== operationRef.current) return;
      setUser(nextUser);
      setError(null);
    } catch (reason) {
      if (!mountedRef.current || operation !== operationRef.current) return;
      setUser(null);
      if (initial && reason instanceof ApiError && reason.status === 401)
        setError(null);
      else if (reason instanceof ApiError && reason.status === 401)
        setError("Session expirée. Veuillez vous reconnecter.");
      else setError(errorMessage(reason, "Connexion indisponible"));
    } finally {
      if (mountedRef.current && operation === operationRef.current)
        setLoading(false);
    }
  }, []);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    const handleExpired = () => {
      operationRef.current += 1;
      if (!mountedRef.current) return;
      setUser(null);
      setError("Session expirée. Veuillez vous reconnecter.");
      setLoading(false);
    };
    window.addEventListener("assurrec:session-expired", handleExpired);
    void refresh({
      initial: true,
    });
    return () =>
      window.removeEventListener("assurrec:session-expired", handleExpired);
  }, [refresh]);
  const login = useCallback(async (email, password) => {
    const operation = ++operationRef.current;
    setLoading(true);
    setError(null);
    try {
      const nextUser = await api.login(email, password);
      if (!mountedRef.current || operation !== operationRef.current) return;
      setUser(nextUser);
    } catch (reason) {
      if (!mountedRef.current || operation !== operationRef.current)
        throw reason;
      setUser(null);
      setError(errorMessage(reason, "Connexion impossible"));
      throw reason;
    } finally {
      if (mountedRef.current && operation === operationRef.current)
        setLoading(false);
    }
  }, []);
  const logout = useCallback(async () => {
    const operation = ++operationRef.current;
    setLoading(true);
    try {
      await api.logout();
      if (!mountedRef.current || operation !== operationRef.current) return;
      setUser(null);
      setError(null);
    } catch (reason) {
      if (mountedRef.current && operation === operationRef.current)
        setError(errorMessage(reason, "Déconnexion impossible"));
      throw reason;
    } finally {
      if (mountedRef.current && operation === operationRef.current)
        setLoading(false);
    }
  }, []);
  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
      refresh,
    }),
    [user, loading, error, login, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return value;
}
