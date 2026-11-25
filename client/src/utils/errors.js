import { ApiError } from "../services/http.js";
export function apiError(error) {
  if (error instanceof ApiError) return error.message;
  if (error?.code === "NETWORK_UNAVAILABLE")
    return "Service indisponible. Vérifiez votre connexion puis réessayez.";
  if (error instanceof Error && error.message) return error.message;
  return "Une erreur est survenue.";
}
export default apiError;
