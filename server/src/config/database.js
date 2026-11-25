import { Sequelize, Transaction, QueryTypes } from "sequelize";
import { config } from "./index.js";

function createConnection() {
  if (!config.databaseUrl) return undefined;
  let url;
  try {
    url = new URL(config.databaseUrl);
  } catch {
    throw new Error("DATABASE_URL est invalide.");
  }
  if (!["mysql:", "mysql2:"].includes(url.protocol))
    throw new Error("DATABASE_URL doit désigner MySQL.");
  const sslValue = url.searchParams.get("ssl")?.toLowerCase();
  const sslMode = url.searchParams.get("ssl-mode")?.toUpperCase();
  const tls =
    process.env.DB_TLS === "true" ||
    url.hostname.endsWith(".tidbcloud.com") ||
    (sslValue !== undefined && sslValue !== "false") ||
    ["REQUIRED", "VERIFY_IDENTITY", "VERIFY_CA"].includes(sslMode);
  return new Sequelize({
    dialect: "mysql",
    host: url.hostname,
    port: Number(url.port || 3306),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    timezone: "+00:00",
    logging: false,
    pool: {
      max: Number(process.env.DB_CONNECTION_LIMIT || 10),
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: tls ? { ssl: { rejectUnauthorized: true } } : {},
  });
}
// Instanciation sans ouvrir une connexion ; aucune migration/sync à l’import.
export const sequelize = createConnection();
export async function assertMigrated() {
  if (!sequelize)
    throw new Error("DATABASE_URL est requis pour vérifier les migrations.");
  const rows = await sequelize.query(
    "SELECT version FROM schema_migrations WHERE version=:version LIMIT 1",
    {
      type: QueryTypes.SELECT,
      replacements: { version: "001_initial" },
    },
  );
  if (rows.length === 0)
    throw new Error("La migration 001_initial n'est pas terminée.");
  return true;
}
export async function withTransaction(callback) {
  if (!sequelize)
    throw new Error("DATABASE_URL est requis pour une transaction.");
  return sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
    callback,
  );
}
export async function closeDatabase() {
  if (sequelize) await sequelize.close();
}
