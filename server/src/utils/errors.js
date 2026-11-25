export class HttpError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
export function badRequest(message, fields) {
  throw new HttpError(400, "VALIDATION_ERROR", message, fields);
}
export function forbidden(message = "Accès refusé") {
  throw new HttpError(403, "FORBIDDEN", message);
}
export function notFound(message = "Ressource introuvable") {
  throw new HttpError(404, "NOT_FOUND", message);
}
export function conflict(message) {
  throw new HttpError(409, "CONFLICT", message);
}
export function requireAuth(req) {
  if (!req.authUser)
    throw new HttpError(401, "UNAUTHENTICATED", "Connexion requise");
  return req.authUser;
}
export function asyncRoute(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}
export function requireActorRole(actor, ...roles) {
  if (!actor) throw new HttpError(401, "UNAUTHENTICATED", "Connexion requise");
  if (!roles.includes(actor.role)) forbidden();
}
