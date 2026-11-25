import rateLimit from "express-rate-limit";
import { HttpError } from "../utils/errors.js";

export function loginLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Trop de tentatives. Réessayez plus tard.",
      },
    },
  });
}
export function requireJson(req, _res, next) {
  if (!req.is("application/json"))
    return next(
      new HttpError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Le corps doit être envoyé en JSON.",
      ),
    );
  next();
}
