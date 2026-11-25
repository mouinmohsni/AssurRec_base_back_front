import * as svc from "../services/auth.service.js";
import { requireAuth } from "../utils/errors.js";
import { assertMigrated } from "../config/database.js";


export async function health(_req, res) {
  try {
    await assertMigrated();
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "unavailable" });
  }
}

export async function login(req, res) {
  const result = await svc.login(
    req.validated.body.email,
    req.validated.body.password,
  );
  svc.setSessionCookie(res, result.token);
  res.json({ user: result.user, csrfToken: result.csrfToken });
}

export async function me(req, res) {
  res.json({ user: requireAuth(req), csrfToken: req.csrfToken });
}

export async function logout(req, res) {
  await svc.logout(requireAuth(req), req.sessionId);
  svc.clearSessionCookie(res);
  res.json({ ok: true });
}
