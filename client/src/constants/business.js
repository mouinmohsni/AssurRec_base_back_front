export const roleLabel = Object.freeze({
  admin: "Administrateur",
  manager: "Gestionnaire",
  agent: "Agent",
});
export const insuranceLabel = Object.freeze({
  auto: "Auto",
  sante: "Santé",
  habitation: "Habitation",
  vie: "Vie",
  professionnelle: "Professionnelle",
});
export const caseStatusLabel = Object.freeze({
  nouveau: "Nouveau",
  en_cours: "En cours",
  promesse_paiement: "Promesse de paiement",
  cloture: "Clôturé",
});
export const priorityLabel = Object.freeze({
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
});
export const contractStatusLabel = Object.freeze({
  actif: "Actif",
  expire: "Expiré",
  resilie: "Résilié",
});
export const installmentStatusLabel = Object.freeze({
  a_venir: "À venir",
  impaye: "Impayé",
  partiel: "Partiel",
  regle: "Réglé",
});
export const paymentMethodLabel = Object.freeze({
  virement: "Virement",
  cheque: "Chèque",
  especes: "Espèces",
});
export const paymentStatusLabel = Object.freeze({
  valide: "Valide",
  annule: "Annulé",
});
export const reminderChannelLabel = Object.freeze({
  telephone: "Téléphone",
  email: "E-mail",
  courrier: "Courrier",
  sms: "SMS",
});
export const reminderStatusLabel = Object.freeze({
  brouillon: "Brouillon",
  consigne: "Consigné",
});

// Alias pluriels lisibles pour les nouveaux composants.
export const roleLabels = roleLabel;
export const insuranceTypeLabels = insuranceLabel;
export const caseStatusLabels = caseStatusLabel;
export const priorityLabels = priorityLabel;
export const contractStatusLabels = contractStatusLabel;
export const installmentStatusLabels = installmentStatusLabel;
export const paymentMethodLabels = paymentMethodLabel;
export const paymentStatusLabels = paymentStatusLabel;
export const reminderChannelLabels = reminderChannelLabel;
export const reminderStatusLabels = reminderStatusLabel;
export const statusLabel = Object.freeze({
  ...caseStatusLabel,
  ...contractStatusLabel,
  ...installmentStatusLabel,
  ...paymentStatusLabel,
  ...reminderStatusLabel,
});
export function toneForPriority(priority) {
  return priority === "haute"
    ? "red"
    : priority === "normale"
      ? "amber"
      : "blue";
}
