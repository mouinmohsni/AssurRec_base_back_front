import { promisify } from "node:util";
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { config, roles } from "../config/index.js";
import { withTransaction } from "../config/database.js";
import { requireAuth, HttpError } from "../utils/errors.js";
import { audit } from "../repositories/audit.repository.js";
import {
  createSession,
  findLoginUser,
  findSession,
  removeSession,
} from "../repositories/auth.repository.js";
import { publicUser } from "../dto/user.mapper.js";

const scrypt = promisify(scryptCallback);

const SESSION_COOKIE = "assurrec_session";
const SESSION_TTL_HOURS = 12;
const DUMMY_HASH =
  "scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";


// fonction de hachage a la place de bcrypt
export async function hashSecret(secret) {
  const salt = randomBytes(16);
  const derived = await scrypt(String(secret), salt, 64);
  return `scrypt$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}


/**
 * Vérifie qu'un secret correspond à un hash précédemment créé par hashSecret.
 */
export async function verifySecret(secret, encoded) {
  try {
    const [, saltText, hashText] = String(encoded || "").split("$");
    if (!saltText || !hashText) return false;
    const expected = Buffer.from(hashText, "base64url");
    const actual = Buffer.from(
      await scrypt(
        String(secret),
        Buffer.from(saltText, "base64url"),
        expected.length,
      ),
    );
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}


function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}
function csrfTokenForSession(token) {
  return createHash("sha256")
    .update(`assurrec-csrf:${token}`)
    .digest("base64url");
}
function cookieOptions() {
  const preview = config.cookieMode !== "local-http";
  return {
    httpOnly: true,
    secure: preview,
    sameSite: preview ? "none" : "lax",
    path: "/",
    maxAge: SESSION_TTL_HOURS * 60 * 60 * 1000,
  };
}
export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}
export function clearSessionCookie(res) {
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie(SESSION_COOKIE, options);
}

async function createOpaqueSession(transaction, userId) {
  const token = randomBytes(32).toString("base64url");
  const csrfToken = csrfTokenForSession(token);
  const session = await createSession(
    {
      userId,
      tokenHash: tokenHash(token),
      csrfTokenHash: tokenHash(csrfToken),
      expiresAt: new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000),
    },
    { transaction },
  );
  return { id: session.id, token, csrfToken };
}

export async function login(email, password) {
  return withTransaction(async (transaction) => {
    const normalized = String(email || "")
      .trim()
      .toLowerCase();
    const user = await findLoginUser(normalized, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const valid =
      user &&
      roles.includes(user.role) &&
      user.active &&
      (await verifySecret(password, user.passwordHash));
    if (!valid) {
      await verifySecret(password, DUMMY_HASH);
      throw new HttpError(
        401,
        "INVALID_CREDENTIALS",
        "E-mail ou mot de passe incorrect.",
      );
    }
    const session = await createOpaqueSession(transaction, user.id);
    const actor = publicUser(user);
    await audit(
      transaction,
      actor,
      "connexion",
      "auth",
      user.id,
      "Connexion réussie",
    );
    return {
      user: actor,
      token: session.token,
      csrfToken: session.csrfToken,
      sessionId: session.id,
    };
  });
}

export async function logout(actor, sessionId) {
  return withTransaction(async (transaction) => {
    await removeSession(sessionId, actor.id, { transaction });
    await audit(
      transaction,
      actor,
      "déconnexion",
      "auth",
      actor.id,
      "Déconnexion",
    );
  });
}

export async function loadSession(req, res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return next();
    const session = await findSession(tokenHash(token));
    if (!session || !session.user || !roles.includes(session.user.role)) {
      clearSessionCookie(res);
      return next();
    }
    req.authUser = publicUser(session.user);
    req.sessionId = session.id;
    req.csrfToken = csrfTokenForSession(token);
    req.csrfTokenHash = session.csrfTokenHash;
    next();
  } catch (error) {
    next(error);
  }
}

export function csrfGuard(req) {
  const actor = requireAuth(req);
  const supplied = String(req.get?.("X-CSRF-Token") ?? "");
  const expected = String(req.csrfTokenHash ?? "");
  const suppliedHash = tokenHash(supplied);
  const a = Buffer.from(suppliedHash, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (!supplied || a.length !== b.length || !timingSafeEqual(a, b))
    throw new HttpError(403, "CSRF_INVALID", "Jeton CSRF invalide");
  return actor;
}
export function requireCsrf(req, _res, next) {
  try {
    csrfGuard(req);
    next();
  } catch (error) {
    next(error);
  }
}
export function authUser(req) {
  return requireAuth(req);
}
export { SESSION_COOKIE };
