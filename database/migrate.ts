import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool, closePool } from '../server/db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const sql = await fs.readFile(path.join(here, '001_initial.sql'), 'utf8');

try {
  // Cette migration est exclusivement un ensemble de CREATE TABLE sans procédures
  // ni chaîne contenant « ; ». Chaque instruction est envoyée séparément :
  // aucune capacité multiStatements et aucune modification globale du serveur.
  const statements = sql
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await getPool().query(statement);
  }
  await getPool().execute(
    'INSERT IGNORE INTO schema_migrations (version) VALUES (?)',
    ['001_initial'],
  );
  console.log('Migration 001_initial appliquée ou déjà présente.');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Erreur inconnue';
  console.error('Migration non terminée :', message);
  process.exitCode = 1;
} finally {
  await closePool();
}
