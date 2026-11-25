import { QueryTypes } from "sequelize";
import {
  sequelize,
  Assure,
  Contrat,
  Echeance,
  Dossier,
  Paiement,
  Relance,
  Utilisateur,
} from "../src/models/index.js";
import {
  withTransaction,
  assertMigrated,
  closeDatabase,
} from "../src/config/database.js";
import { config, todayUtc } from "../src/config/index.js";
import { hashSecret } from "../src/services/auth.service.js";
import { audit } from "../src/repositories/audit.repository.js";

const dateShift = (days) => {
  const date = new Date(`${todayUtc()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
try {
  if (!config.demoEnabled) {
    console.log("DEMO_ENABLED n'est pas true : seed ignoré.");
  } else {
    await assertMigrated();
    // DDL hors transaction : ne pas provoquer de commit implicite des données.
    await sequelize.query(
      "CREATE TABLE IF NOT EXISTS seed_markers (version VARCHAR(100) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    );
    const created = await withTransaction(async (transaction) => {
      const seen = await sequelize.query(
        "SELECT version FROM seed_markers WHERE version=:version FOR UPDATE",
        {
          type: QueryTypes.SELECT,
          replacements: { version: "demo-001" },
          transaction,
        },
      );
      if (seen.length) return false;
      const passwordHash = await hashSecret(config.demoPassword);
      const users = [];
      for (const [name, email, role] of [
        ["Administrateur démo", "admin@assurrec.demo", "admin"],
        ["Gestionnaire démo", "gestionnaire@assurrec.demo", "manager"],
        ["Agent démo", "agent@assurrec.demo", "agent"],
        ["Agent secondaire démo", "agent2@assurrec.demo", "agent"],
      ]) {
        const existing = await Utilisateur.findOne({
          where: { email },
          transaction,
        });
        users.push(
          existing ??
            (await Utilisateur.create(
              { name, email, role, passwordHash, active: true },
              { transaction },
            )),
        );
      }
      const first = [
        "Amel",
        "Yassine",
        "Sonia",
        "Nour",
        "Hichem",
        "Meriem",
        "Walid",
        "Ines",
        "Fares",
        "Rim",
      ];
      const last = [
        "Ben Ali",
        "Trabelsi",
        "Mansour",
        "Gharbi",
        "Jlassi",
        "Khalfallah",
        "Ayari",
        "Saidi",
        "Chaabane",
        "Mrad",
      ];
      const insureds = [];
      for (let index = 0; index < 20; index++) {
        const reference = `ASS-${String(index + 1).padStart(4, "0")}`;
        insureds.push(
          (await Assure.findOne({ where: { reference }, transaction })) ??
            (await Assure.create(
              {
                reference,
                name: `${first[index % 10]} ${last[index % 10]}`,
                email: `assure${index + 1}@example.test`,
                phone: `+216 00 ${100000 + index}`,
                address: `Adresse fictive ${index + 1}, Tunis`,
                active: true,
              },
              { transaction },
            )),
        );
      }
      const contracts = [];
      const types = ["auto", "sante", "habitation", "vie", "professionnelle"];
      for (let index = 0; index < 30; index++) {
        const reference = `CTR-${String(index + 1).padStart(4, "0")}`;
        contracts.push(
          (await Contrat.findOne({ where: { reference }, transaction })) ??
            (await Contrat.create(
              {
                reference,
                insuredId: insureds[index % insureds.length].id,
                insuranceType: types[index % 5],
                startDate: dateShift(-365),
                endDate: dateShift(365),
                status: "actif",
              },
              { transaction },
            )),
        );
      }
      const installments = [];
      for (let index = 0; index < 60; index++) {
        const reference = `ECH-${String(index + 1).padStart(4, "0")}`;
        const contract = contracts[index % contracts.length];
        const candidate = dateShift(-170 + (index % 12) * 28);
        const dueDate =
          candidate < contract.startDate
            ? contract.startDate
            : candidate > contract.endDate
              ? contract.endDate
              : candidate;
        installments.push(
          (await Echeance.findOne({ where: { reference }, transaction })) ??
            (await Echeance.create(
              {
                reference,
                contractId: contract.id,
                dueDate,
                amountMilli: 50000 + (index % 6) * 12500,
              },
              { transaction },
            )),
        );
      }
      const indices = [0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16, 17];
      const actor = { id: Number(users[1].id), role: "manager" };
      for (let index = 0; index < indices.length; index++) {
        const installment = installments[indices[index]];
        if (installment.dueDate >= todayUtc()) continue;
        const existing = await Dossier.findOne({
          where: { installmentId: installment.id },
          transaction,
        });
        if (existing) continue;
        const reference = `DOS-DEMO-${String(index + 1).padStart(3, "0")}`;
        const status =
          index === 0
            ? "promesse_paiement"
            : index === 1
              ? "cloture"
              : index % 4 === 0
                ? "en_cours"
                : "nouveau";
        const dossier = await Dossier.create(
          {
            reference,
            installmentId: installment.id,
            agentId: users[2 + (index % 2)].id,
            status,
            priority: ["haute", "normale", "basse"][index % 3],
            openedAt: dateShift(-20),
            promiseDate: status === "promesse_paiement" ? dateShift(10) : null,
            notes: "Dossier fictif de démonstration.",
          },
          { transaction },
        );
        if (status === "cloture" || index % 3 !== 0)
          await Paiement.create(
            {
              reference: `PAY-DEMO-${index + 1}`,
              installmentId: installment.id,
              caseId: dossier.id,
              amountMilli:
                status === "cloture"
                  ? Number(installment.amountMilli)
                  : 10000 + (index % 3) * 5000,
              paidAt: dateShift(-8 + (index % 5)),
              method: "virement",
              status: "valide",
              recordedBy: users[1].id,
            },
            { transaction },
          );
        await Relance.create(
          {
            caseId: dossier.id,
            channel: index % 2 ? "telephone" : "email",
            subject: "Contact fictif AssurRec",
            content: "Simulation interne : aucun message ni paiement réel.",
            status: "consigne",
            scheduledDate: dateShift(-10),
            createdBy: users[1].id,
          },
          { transaction },
        );
        await audit(
          transaction,
          actor,
          "donnees_demo",
          "case",
          Number(dossier.id),
          "Création explicite de données fictives.",
        );
      }
      await sequelize.query(
        "INSERT INTO seed_markers (version) VALUES (:version)",
        { replacements: { version: "demo-001" }, transaction },
      );
      return true;
    });
    console.log(
      created
        ? "Démo créée : 20 assurés, 30 contrats, 60 échéances et opérations fictives."
        : "Démo déjà présente : aucune donnée ni mot de passe remplacé.",
    );
  }
} catch (error) {
  console.error("Seed non terminé.", error.original?.code ?? error.name);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
