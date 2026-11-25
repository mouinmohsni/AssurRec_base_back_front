import { api } from "./http.js";
export { ApiError, api, mutation, query, request } from "./http.js";

// Ces alias gardent les appels d'authentification courts pour les composants.
export const me = (...args) => api.me(...args);
export const login = (...args) => api.login(...args);
export const logout = (...args) => api.logout(...args);
export const demoInfo = (...args) => api.demoInfo(...args);
export const agents = (...args) => api.agents(...args);
export default api;
