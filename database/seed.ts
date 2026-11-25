import "dotenv/config";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getPool, withTransaction, closePool } from "../server/db.js";
import { config, todayUtc } from "../server/config.js";
import { hashSecret } from "../server/auth.js";

type Row = RowDataPacket & Record<string, unknown>;
const version = "demo-001";
const dateShift = (days: number) => {
  const date = new Date(`${todayUtc()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

if (!config.demoEnabled) {
  console.log("DEMO_ENABLED n’est pas true ; seed ignoré.");
  process.exit(0);
}

try {
  // MySQL DDL peut valider implicitement une transaction : préparation hors DML.
  await getPool().execute(
    "CREATE TABLE IF NOT EXISTS seed_markers (version VARCHAR(100) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)",
  );
  const created = await withTransaction(async (connection) => {
    const [seen] = await connection.execute<Row[]>(
      "SELECT version FROM seed_markers WHERE version=? FOR UPDATE",
      [version],
    );
    if (seen[0]) return false;
    const passwordHash = await hashSecret(config.demoPassword);
    const accounts = [
      ["Administrateur démo", "admin@assurrec.demo", "admin"],
      ["Gestionnaire démo", "gestionnaire@assurrec.demo", "manager"],
      ["Agent démo", "agent@assurrec.demo", "agent"],
      ["Agent secondaire démo", "agent2@assurrec.demo", "agent"],
    ];
    const userIds: number[] = [];
    for (const [name, email, role] of accounts) {
      const [old] = await connection.execute<Row[]>("SELECT id FROM users WHERE email=?", [email]);
      if (old[0]) {
        userIds.push(Number(old[0].id));
      } else {
        const [result] = await connection.execute<ResultSetHeader>(
          "INSERT INTO users (name,email,password_hash,role,active) VALUES (?,?,?,?,1)",
          [name, email, passwordHash, role],
        );
        userIds.push(result.insertId);
      }
    }

    const firstNames = ["Amel", "Yassine", "Sonia", "Nour", "Hichem", "Meriem", "Walid", "Ines", "Fares", "Rim"];
    const surnames = ["Ben Ali", "Trabelsi", "Mansour", "Gharbi", "Jlassi", "Khalfallah", "Ayari", "Saidi", "Chaabane", "Mrad"];
    const insuredIds: number[] = [];
    for (let index = 0; index < 20; index++) {
      const reference = `ASS-${String(index + 1).padStart(4, "0")}`;
      const [old] = await connection.execute<Row[]>("SELECT id FROM insureds WHERE reference=?", [reference]);
      if (old[0]) {
        insuredIds.push(Number(old[0].id));
      } else {
        const [result] = await connection.execute<ResultSetHeader>(
          "INSERT INTO insureds (reference,name,email,phone,address,active) VALUES (?,?,?,?,?,1)",
          [reference, `${firstNames[index % 10]} ${surnames[index % 10]}`, `assure${index + 1}@example.test`, `+216 00 ${String(100000 + index)}`, `Adresse fictive ${index + 1}, Tunis`],
        );
        insuredIds.push(result.insertId);
      }
    }

    const insuranceTypes = ["auto", "sante", "habitation", "vie", "professionnelle"];
    const contractIds: number[] = [];
    for (let index = 0; index < 30; index++) {
      const reference = `CTR-${String(index + 1).padStart(4, "0")}`;
      const [old] = await connection.execute<Row[]>("SELECT id FROM contracts WHERE reference=?", [reference]);
      if (old[0]) {
        contractIds.push(Number(old[0].id));
      } else {
        const [result] = await connection.execute<ResultSetHeader>(
          "INSERT INTO contracts (reference,insured_id,insurance_type,start_date,end_date,status) VALUES (?,?,?,?,?,?)",
          [reference, insuredIds[index % insuredIds.length], insuranceTypes[index % 5], dateShift(-365), dateShift(365), "actif"],
        );
        contractIds.push(result.insertId);
      }
    }

    const installmentIds: number[] = [];
    for (let index = 0; index < 60; index++) {
      const reference = `ECH-${String(index + 1).padStart(4, "0")}`;
      const [old] = await connection.execute<Row[]>("SELECT id FROM installments WHERE reference=?", [reference]);
      if (old[0]) {
        installmentIds.push(Number(old[0].id));
      } else {
        const contractId = contractIds[index % contractIds.length];
        const [contracts] = await connection.execute<Row[]>(
          "SELECT start_date AS startDate,end_date AS endDate FROM contracts WHERE id=?",
          [contractId],
        );
        const candidate = dateShift(-170 + (index % 12) * 28);
        const start = String(contracts[0].startDate);
        const end = String(contracts[0].endDate);
        const dueDate = candidate < start ? start : candidate > end ? end : candidate;
        const [result] = await connection.execute<ResultSetHeader>(
          "INSERT INTO installments (reference,contract_id,due_date,amount_milli) VALUES (?,?,?,?)",
          [reference, contractId, dueDate, 50000 + (index % 6) * 12500],
        );
        installmentIds.push(result.insertId);
      }
    }

    // Seulement les six échéances dépassées de chacun de deux cycles.
    const overdueIndices = [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17];
    for (let index = 0; index < overdueIndices.length; index++) {
      const reference = `DOS-DEMO-${String(index + 1).padStart(3, "0")}`;
      const [old] = await connection.execute<Row[]>("SELECT id FROM recovery_cases WHERE reference=?", [reference]);
      if (old[0]) continue;
      const installmentId = installmentIds[overdueIndices[index]];
      const [installments] = await connection.execute<Row[]>(
        "SELECT due_date AS dueDate,amount_milli AS amountMilli FROM installments WHERE id=?",
        [installmentId],
      );
      if (String(installments[0].dueDate) >= todayUtc()) continue;
      const [existing] = await connection.execute<Row[]>(
        "SELECT id FROM recovery_cases WHERE installment_id=?",
        [installmentId],
      );
      if (existing[0]) continue;
      const status = index === 0 ? "promesse_paiement" : index === 1 ? "cloture" : index % 4 === 0 ? "en_cours" : "nouveau";
      const [result] = await connection.execute<ResultSetHeader>(
        "INSERT INTO recovery_cases (reference,installment_id,agent_id,status,priority,opened_at,promise_date,notes) VALUES (?,?,?,?,?,?,?,?)",
        [reference, installmentId, userIds[2 + (index % 2)], status, ["haute", "normale", "basse"][index % 3], dateShift(-20), status === "promesse_paiement" ? dateShift(10) : null, "Dossier de démonstration entièrement fictif."],
      );
      const caseId = result.insertId;
      const paymentAmount = status === "cloture" ? Number(installments[0].amountMilli) : 10000 + (index % 3) * 5000;
      if (status === "cloture" || index % 3 !== 0) {
        await connection.execute(
          "INSERT INTO payments (reference,installment_id,case_id,amount_milli,paid_at,method,status,recorded_by) VALUES (?,?,?,?,?,?,?,?)",
          [`PAY-DEMO-${index + 1}`, installmentId, caseId, paymentAmount, dateShift(-8 + (index % 5)), "virement", "valide", userIds[1]],
        );
      }
      await connection.execute(
        "INSERT INTO reminders (case_id,channel,subject,content,status,scheduled_date,created_by) VALUES (?,?,?,?,?,?,?)",
        [caseId, index % 2 ? "telephone" : "email", "Contact fictif AssurRec", "Simulation interne : aucun message ni encaissement réel.", "consigne", dateShift(-10), userIds[1]],
      );
      await connection.execute(
        "INSERT INTO audit_events (actor_id,actor_role,action,entity_type,entity_id,details) VALUES (?,?,?,?,?,?)",
        [userIds[1], "manager", "donnees_demo", "case", caseId, "Création explicite de données fictives de démonstration."],
      );
    }
    await connection.execute("INSERT INTO seed_markers (version) VALUES (?)", [version]);
    return true;
  });
  console.log(created ? "Démo fictive créée : 20 assurés, 30 contrats, 60 échéances et dossiers cohérents." : "Démo déjà préparée : aucune donnée ni mot de passe remplacé.");
} catch (error) {
  console.error("Seed non terminé :", error instanceof Error ? error.message : "Erreur inconnue");
  process.exitCode = 1;
} finally {
  await closePool();
}
