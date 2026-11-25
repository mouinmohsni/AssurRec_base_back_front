import { sequelize } from "../config/database.js";
import { initAssure, Assure } from "./assure.js";
import { initContrat, Contrat } from "./contrat.js";
import { initEcheance, Echeance } from "./echeance.js";
import { initDossier, Dossier } from "./dossier.js";
import { initPaiement, Paiement } from "./paiement.js";
import { initRelance, Relance } from "./relance.js";
import { initUtilisateur, Utilisateur } from "./utilisateur.js";
import { initSession, Session } from "./session.js";
import { initAuditEvent, AuditEvent } from "./audit-event.js";

if (sequelize) {
  initAssure(sequelize);
  initContrat(sequelize);
  initEcheance(sequelize);
  initDossier(sequelize);
  initPaiement(sequelize);
  initRelance(sequelize);
  initUtilisateur(sequelize);
  initSession(sequelize);
  initAuditEvent(sequelize);
  Contrat.belongsTo(Assure, { foreignKey: "insuredId", as: "insured" });
  Assure.hasMany(Contrat, { foreignKey: "insuredId", as: "contracts" });
  Echeance.belongsTo(Contrat, { foreignKey: "contractId", as: "contract" });
  Contrat.hasMany(Echeance, { foreignKey: "contractId", as: "installments" });
  Dossier.belongsTo(Echeance, {
    foreignKey: "installmentId",
    as: "installment",
  });
  Echeance.hasMany(Dossier, { foreignKey: "installmentId", as: "cases" });
  Dossier.belongsTo(Utilisateur, { foreignKey: "agentId", as: "agent" });
  Paiement.belongsTo(Echeance, {
    foreignKey: "installmentId",
    as: "installment",
  });
  Paiement.belongsTo(Dossier, { foreignKey: "caseId", as: "case" });
  Paiement.belongsTo(Utilisateur, {
    foreignKey: "recordedBy",
    as: "recordedByUser",
  });
  Relance.belongsTo(Dossier, { foreignKey: "caseId", as: "case" });
  Relance.belongsTo(Utilisateur, {
    foreignKey: "createdBy",
    as: "createdByUser",
  });
  AuditEvent.belongsTo(Utilisateur, { foreignKey: "actorId", as: "actor" });
  Session.belongsTo(Utilisateur, { foreignKey: "userId", as: "user" });
}

export {
  sequelize,
  Assure,
  Contrat,
  Echeance,
  Dossier,
  Paiement,
  Relance,
  Utilisateur,
  Session,
  AuditEvent,
};
