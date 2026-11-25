import { ZodError } from "zod";
import { HttpError } from "../utils/errors.js";

export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return _next(error);
  if (error instanceof ZodError) {
    const fields = {};
    for (const issue of error.issues)
      fields[issue.path.join(".") || "form"] ??= issue.message;
    return res
      .status(400)
      .json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Les données envoyées sont invalides.",
          fields,
        },
      });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    });
  }
  if (error.type === "entity.parse.failed")
    return res
      .status(400)
      .json({
        error: { code: "INVALID_JSON", message: "Le corps JSON est invalide." },
      });
  if (error.type === "entity.too.large")
    return res
      .status(413)
      .json({
        error: {
          code: "BODY_TOO_LARGE",
          message: "La requête est trop volumineuse.",
        },
      });
  const sqlCode = error.original?.code ?? error.parent?.code ?? error.code;
  if (
    error.name === "SequelizeUniqueConstraintError" ||
    sqlCode === "ER_DUP_ENTRY"
  ) {
    return res
      .status(409)
      .json({
        error: {
          code: "CONFLICT",
          message: "Cette référence ou adresse e-mail existe déjà.",
        },
      });
  }
  if (
    error.name === "SequelizeForeignKeyConstraintError" ||
    ["ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2"].includes(sqlCode)
  ) {
    return res
      .status(409)
      .json({
        error: {
          code: "CONFLICT",
          message: "Cette opération violerait une relation existante.",
        },
      });
  }
  if (error.name === "SequelizeValidationError") {
    const fields = {};
    for (const issue of error.errors ?? [])
      fields[issue.path ?? "form"] = "Valeur invalide.";
    return res
      .status(400)
      .json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Les données envoyées sont invalides.",
          fields,
        },
      });
  }
  if (["ER_LOCK_DEADLOCK", "ER_LOCK_WAIT_TIMEOUT"].includes(sqlCode))
    return res
      .status(409)
      .json({
        error: {
          code: "CONCURRENT_OPERATION",
          message:
            "Une autre opération est en cours. Actualisez puis réessayez.",
        },
      });
  console.error(
    "[assurrec] erreur interne",
    error.name ?? "Error",
    sqlCode ?? "",
  );
  return res
    .status(500)
    .json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Une erreur interne est survenue.",
      },
    });
}
