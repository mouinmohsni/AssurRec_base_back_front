import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
async function collect(folder) {
  const output = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) output.push(...(await collect(target)));
    else if (entry.name.endsWith(".js")) output.push(target);
  }
  return output;
}
let count = 0;
for (const directory of ["src", "database", "scripts"]) {
  for (const file of await collect(path.join(root, directory))) {
    const result = spawnSync(process.execPath, ["--check", file], {
      stdio: "inherit",
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
    count++;
  }
}
const lint = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/eslint/bin/eslint.js"),
    "src",
    "database",
    "scripts",
  ],
  { cwd: root, stdio: "inherit" },
);
if (lint.status !== 0) process.exit(lint.status ?? 1);
console.log(
  `Syntaxe et lint : ${count} fichiers JavaScript valides. Ce contrôle n'est pas une campagne de tests métier.`,
);
