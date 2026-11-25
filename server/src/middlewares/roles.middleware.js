import { requireAuth, forbidden } from "../utils/errors.js";

export function requireAuthenticated(req, _res, next) {
  try {
    requireAuth(req);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    try {
      const actor = requireAuth(req);
      if (!roles.includes(actor.role)) forbidden();
      next();
    } catch (error) {
      next(error);
    }
  };
}
