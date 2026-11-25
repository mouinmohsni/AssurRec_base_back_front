import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sequelize, closeDatabase } from "../src/config/database.js";

const here = path.dirname(fileURLToPath(import.meta.url));
try {
  const sql = await fs.readFile(path.join(here, "001_initial.sql"), "utf8");
  // Le fichier contient seulement du DDL simple, sans procédure ni ; dans une chaîne.
  for (const statement of sql
    .replace(/^\s*--.*$/gm, "")
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)) {
    await sequelize.query(statement);
  }
  await sequelize.query(
    "INSERT IGNORE INTO schema_migrations (version) VALUES (:version)",
    { replacements: { version: "001_initial" } },
  );
  console.log(
    "Migration 001_initial appliquée ou déjà présente ; aucune table recréée.",
  );
} catch (error) {
  console.error("Migration non terminée.", error.original?.code ?? error.name);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
