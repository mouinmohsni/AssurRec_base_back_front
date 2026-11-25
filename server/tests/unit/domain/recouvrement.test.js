import { calculateBalanceMilli,validateAmountMilli,assertCaseTransition ,assertPaymentWithinBalance,assertOverdueWithDebt } from "../../../src/domain/recouvrement.js";



//========================== test unitaire de fonction calculateBalanceMilli

test("calcule le solde restant après un paiement partiel", () => {
    // Arrange : l'échéance vaut 100 000 millimes et 25 000 ont été payés.
    const montantEcheance = 100000;
    const montantPaye = 25000;

    // Act : on demande au code métier de calculer le solde.
    const solde = calculateBalanceMilli(montantEcheance, montantPaye);

    // Assert : il doit rester 75 000 millimes.
    expect(solde).toBe(75000);
});

test("retourne un solde nul quand l'échéance est entièrement payée", () => {
    // Arrange : le montant payé est égal au montant de l'échéance.
    const montantEcheance = 100000;
    const montantPaye = 100000;

    // Act : on calcule le solde.
    const solde = calculateBalanceMilli(montantEcheance, montantPaye);

    // Assert : il ne reste rien à payer.
    expect(solde).toBe(0);
});

test("refuse un total payé supérieur au montant de l'échéance", () => {
    // Arrange : l'échéance vaut 100 000, mais 110 000 sont indiqués comme payés.
    const montantEcheance = 100000;
    const montantPaye = 110000;

    // Act + Assert : le calcul doit déclencher l'erreur métier attendue.
    expect(() =>
        calculateBalanceMilli(montantEcheance, montantPaye),
    ).toThrow("Le total payé ne peut pas dépasser le montant de l’échéance.");
});

//====================================test unitaire de validateAmountMilli

test("refuse un montant de paiement égal à zéro", () => {
    expect(() => validateAmountMilli(0)).toThrow(
        "Le montant doit être un entier positif en millimes.",
    );
});

test("refuse un montant de paiement négatif", () => {
    expect(() => validateAmountMilli(-1)).toThrow(
        "Le montant doit être un entier positif en millimes.",
    );
});

test("refuse un montant qui n'est pas un entier", () => {
    expect(() => validateAmountMilli(1.5)).toThrow(
        "Le montant doit être un entier positif en millimes.",
    );
});

//========================== test unitaire de fonction assertPaymentWithinBalance

test("autorise un paiement exactement égal au solde dû", () => {
    expect(() => assertPaymentWithinBalance(25000, 25000)).not.toThrow();
});

test("refuse un paiement supérieur au solde dû", () => {
    expect(() => assertPaymentWithinBalance(25001, 25000)).toThrow(
        "Le paiement ne peut pas dépasser le solde dû.",
    );
});

//========================== test unitaire de fonction assertOverdueWithDebt
test("accepte une échéance dépassée avec un solde positif", () => {
    expect(() =>
        assertOverdueWithDebt("2026-11-09", 5000, "2026-11-10"),
    ).not.toThrow();
});

test("refuse une échéance due aujourd'hui pour un nouveau dossier", () => {
    expect(() =>
        assertOverdueWithDebt("2026-11-10", 5000, "2026-11-10"),
    ).toThrow("Un dossier exige une échéance dépassée avec un solde positif.");
});

test("refuse une échéance dépassée sans solde à payer", () => {
    expect(() =>
        assertOverdueWithDebt("2026-11-09", 0, "2026-11-10"),
    ).toThrow("Un dossier exige une échéance dépassée avec un solde positif.");
});

//========================== test unitaire de fonction assertCaseTransition

test("autorise le passage d'un dossier nouveau à en cours", () => {
    expect(() =>
        assertCaseTransition(
            "nouveau",       // Statut actuel
            "en_cours",      // Nouveau statut
            "agent",         // Rôle de l'utilisateur
            5000,            // Solde restant en millimes
            null,            // Pas de promesse de paiement
            "2026-11-10",    // Date du jour utilisée par le test
        ),
    ).not.toThrow();
});

test("refuse de clôturer un dossier s'il reste une dette", () => {
    expect(() =>
        assertCaseTransition(
            "en_cours",
            "cloture",
            "agent",
            5000,
            null,
            "2026-11-10",
        ),
    ).toThrow("Un dossier ne peut être clôturé que lorsque le solde est nul.");
});

test("autorise la clôture d'un dossier lorsque le solde est nul", () => {
    expect(() =>
        assertCaseTransition(
            "en_cours",
            "cloture",
            "agent",
            0,
            null,
            "2026-11-10",
        ),
    ).not.toThrow();
});

test("refuse une promesse de paiement dont la date est passée", () => {
    expect(() =>
        assertCaseTransition(
            "en_cours",
            "promesse_paiement",
            "agent",
            5000,
            "2026-11-09",
            "2026-11-10",
        ),
    ).toThrow("Une date de promesse aujourd’hui ou future est requise.");
});

test("autorise un gestionnaire à rouvrir un dossier clôturé s'il reste une dette", () => {
    expect(() =>
        assertCaseTransition(
            "cloture",
            "en_cours",
            "manager",
            5000,
            null,
            "2026-11-10",
        ),
    ).not.toThrow();
});

test("refuse à un agent de rouvrir un dossier clôturé", () => {
    expect(() =>
        assertCaseTransition(
            "cloture",
            "en_cours",
            "agent",
            5000,
            null,
            "2026-11-10",
        ),
    ).toThrow("Transition de dossier non autorisée.");
});





