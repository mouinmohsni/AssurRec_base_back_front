// À placer dans client/tests/e2e/page-connexion.test.js.
// Exécution : node ./tests/e2e/page-connexion.test.js
// Base locale de démonstration uniquement : un dossier et une relance seront créés.
// Les actions métier sont effectuées dans l'interface ; les GET API servent
// uniquement à choisir les données et vérifier les effets persistés.

import assert from "node:assert/strict";
import console from "node:console";
import process from "node:process";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { URL, URLSearchParams, fileURLToPath } from "node:url";
import { setTimeout as pause } from "node:timers/promises";
import { Builder, By, until } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import { Select } from "selenium-webdriver/lib/select.js";
import { StaleElementReferenceError } from "selenium-webdriver/lib/error.js";

const APP_URL = "http://localhost:3000";
const BRAVE_PATH = process.env.BRAVE_PATH ||
    "C:\\Users\\mouin\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
const PASSWORD = process.env.ASSURREC_TEST_PASSWORD || "AssurRec-Demo-2026!";
const ACCOUNTS = {
    admin: "admin@assurrec.demo",
    manager: "gestionnaire@assurrec.demo",
    agent: "agent@assurrec.demo",
};
const PAUSE_MS = 5000;
const TIMEOUT_MS = 20000;
const RETRIES = 4;
const RUN_ID = `E2E-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`;
const NOTES = `Dossier fictif de démonstration Selenium : ${RUN_ID}`;
const SUBJECT = `Relance téléphonique ${RUN_ID}`;
const CONTENT = "Contact fictif consigné pendant le parcours Selenium. Aucun appel réel.";
const RESULT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "results", RUN_ID);
const report = { runId: RUN_ID, status: "running", startedAt: new Date().toISOString(), steps: [] };

let driver;
let currentStep = "Démarrage";
let agent;
let manager;
let installment;
let recoveryCase;

// React recrée le DOM pendant le chargement des listes : la référence
// Selenium devient alors « stale ». On re-localise l'élément et on réessaie.
function isStale(error) {
    return error instanceof StaleElementReferenceError ||
        /stale element|Element is not attached to the document/i.test(String(error?.message || ""));
}

async function retry(action, tries = RETRIES) {
    for (let attempt = 1; ; attempt++) {
        try {
            return await action();
        } catch (error) {
            if (!isStale(error) || attempt >= tries) throw error;
            console.log(`  Domaine recharge, nouvel essai ${attempt}/${tries - 1}...`);
            await pause(400);
        }
    }
}

// Les pauses sont seulement visuelles. Les wait attendent réellement les éléments.
async function step(label, action) {
    currentStep = label;
    console.log(`\n[ÉTAPE] ${label}`);
    const entry = { label, startedAt: new Date().toISOString(), status: "running" };
    report.steps.push(entry);
    try {
        const result = await action();
        await pause(PAUSE_MS);
        entry.status = "passed";
        entry.finishedAt = new Date().toISOString();
        console.log(`[OK] ${label}`);
        return result;
    } catch (error) {
        entry.status = "failed";
        entry.error = error.message;
        throw error;
    }
}

async function visibleOnce(locator) {
    const element = await driver.wait(until.elementLocated(locator), TIMEOUT_MS);
    await driver.wait(until.elementIsVisible(element), TIMEOUT_MS);
    return element;
}

function visible(locator) {
    return retry(() => visibleOnce(locator), RETRIES);
}

function click(locator) {
    return retry(async () => {
        const element = await visibleOnce(locator);
        await driver.wait(until.elementIsEnabled(element), TIMEOUT_MS);
        await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", element);
        await element.click();
    }, RETRIES);
}

function fill(locator, value) {
    return retry(async () => {
        const element = await visibleOnce(locator);
        await driver.wait(until.elementIsEnabled(element), TIMEOUT_MS);
        await element.clear();
        await element.sendKeys(String(value));
    }, RETRIES);
}

// Texte visible : utilisé pour les assertions, avec re-localisation.
function text(locator) {
    return retry(async () => {
        const element = await visibleOnce(locator);
        return (await element.getText()).trim();
    }, RETRIES);
}

// Recherche un contrôle uniquement dans le formulaire concerné.
// Exemple réel : #case-form > label avec le span « Agent affecté ».
function field(formId, label, tag = "select") {
    return By.xpath(
        `//*[@id='${formId}']//label[span[contains(@class, 'field-label') and starts-with(normalize-space(.), '${label}')]]//${tag}`,
    );
}

async function optionAvailable(locator, value) {
    const element = await driver.findElement(locator);
    const options = await element.findElements(By.css("option"));
    for (const option of options) {
        try {
            if ((await option.getAttribute("value")) === String(value)) {
                return (await element.isEnabled()) && (await element.getAttribute("aria-busy")) !== "true";
            }
        } catch (error) {
            if (isStale(error)) return false;
            throw error;
        }
    }
    return false;
}

function selectValue(locator, value) {
    return retry(async () => {
        await visibleOnce(locator);
        await driver.wait(() => optionAvailable(locator, value), TIMEOUT_MS,
            `L'option ${value} n'est pas disponible dans la liste.`);
        const element = await driver.findElement(locator);
        await new Select(element).selectByValue(String(value));
        const fresh = await driver.findElement(locator);
        assert.equal(await fresh.getAttribute("value"), String(value));
    }, RETRIES);
}

async function formClosed(formId) {
    await driver.wait(async () => {
        const messages = await driver.findElements(By.css(`#${formId} .form-error`));
        for (const message of messages) {
            try {
                if (await message.isDisplayed()) {
                    const text = await message.getText();
                    if (text.trim()) throw new Error(`Formulaire ${formId} : ${text}`);
                }
            } catch (error) {
                if (isStale(error)) continue;
                if (error instanceof assert.AssertionError) throw error;
                if (/Formulaire/.test(String(error.message))) throw error;
                continue;
            }
        }
        return (await driver.findElements(By.id(formId))).length === 0;
    }, TIMEOUT_MS, `Le formulaire ${formId} ne s'est pas fermé après sauvegarde.`);
}

// Ce code s'exécute DANS Brave. Il n'utilise que des requêtes GET.
async function apiGet(requestPath, expectedStatus = 200) {
    assert.ok(requestPath.startsWith("/api/"));
    const response = await driver.executeAsyncScript(`
    const requestPath = arguments[0];
    const done = arguments[arguments.length - 1];
    window.fetch(requestPath, { method: 'GET', credentials: 'include' })
      .then(async (response) => {
        const text = await response.text();
        let body = null;
        try { body = JSON.parse(text); } catch { /* réponse non JSON */ }
        done({ status: response.status, body });
      })
      .catch((error) => done({ networkError: String(error) }));
  `, requestPath);
    if (response.networkError) throw new Error(response.networkError);
    assert.equal(response.status, expectedStatus,
        `${requestPath} : HTTP ${response.status}. ${response.body?.error?.message || ""}`);
    return response.body;
}

// Ne se limite pas aux 100 premières ressources.
async function allItems(resource, filters = {}) {
    const items = [];
    for (let page = 1; page <= 1000; page++) {
        const query = new URLSearchParams({ ...filters, page: String(page), pageSize: "100" });
        const data = await apiGet(`${resource}?${query}`);
        assert.ok(Array.isArray(data.items), `Liste invalide : ${resource}`);
        items.push(...data.items);
        if (items.length >= Number(data.total)) return items;
        assert.ok(data.items.length > 0, `Pagination incohérente : ${resource}`);
    }
    throw new Error(`Plus de 1000 pages : réduire les données de démonstration (${resource}).`);
}

async function login(role) {
    await step(`Saisir l'e-mail du profil ${role}`, () =>
        fill(By.css('.login-card input[type="email"]'), ACCOUNTS[role]));
    await step(`Saisir le mot de passe de démonstration (${role})`, () =>
        fill(By.css('.login-card input[type="password"]'), PASSWORD));
    return step(`Connexion ${role} et affichage du tableau de bord`, async () => {
        await click(By.css('.login-card button[type="submit"]'));
        await driver.wait(async () => {
            const errors = await driver.findElements(By.css(".login-card .form-error"));
            for (const element of errors) {
                try {
                    if (await element.isDisplayed()) throw new Error(await element.getText());
                } catch (error) {
                    if (isStale(error)) continue;
                    throw error;
                }
            }
            const url = new URL(await driver.getCurrentUrl());
            return url.origin === APP_URL && url.pathname === "/";
        }, TIMEOUT_MS, "La connexion n'a pas ouvert le tableau de bord.");
        assert.equal(await text(By.css(".page-header h1")), "Vue d’ensemble");
        const session = await apiGet("/api/auth/me");
        assert.equal(session.user.role, role);
        assert.equal(session.user.email, ACCOUNTS[role]);
        return session.user;
    });
}

async function logout(role) {
    await step(`Déconnexion ${role} et retour à la page de connexion`, async () => {
        await click(By.css("button.logout-link"));
        await visible(By.css('.login-card input[type="email"]'));
        assert.equal(new URL(await driver.getCurrentUrl()).pathname, "/connexion");
        // Le formulaire seul ne prouve pas que la session a été invalidée.
        await apiGet("/api/auth/me", 401);
    });
}

async function openCases() {
    await click(By.css('nav a[href="/dossiers"]'));
    assert.equal(await text(By.css(".page-header h1")), "Dossiers");
}

async function findAndOpenCase() {
    await openCases();
    await fill(By.css(".search-box input"), recoveryCase.reference);
    const link = By.css(`table a[href="/dossiers/${recoveryCase.id}"]`);
    await visible(link);
    await click(link);
    await visible(By.css(".detail-summary"));
    assert.equal(await text(By.css(".detail-title .reference")), recoveryCase.reference);
}

function assertContext(detail) {
    assert.equal(Number(detail.case.installmentId), Number(installment.id));
    assert.equal(Number(detail.case.agentId), Number(agent.id));
    assert.equal(Number(detail.installment.contractId), Number(detail.contract.id));
    assert.equal(Number(detail.contract.insuredId), Number(detail.insured.id));
    assert.equal(detail.installment.reference, installment.reference);
    assert.equal(detail.case.notes, NOTES);
}

async function saveScreenshot(name) {
    await writeFile(path.join(RESULT_DIR, name), await driver.takeScreenshot(), "base64");
}

try {
    await mkdir(RESULT_DIR, { recursive: true });
    const options = new chrome.Options();
    options.setChromeBinaryPath(BRAVE_PATH);
    driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    await driver.manage().window().setRect({ width: 1440, height: 1000 });
    await driver.manage().setTimeouts({ implicit: 0, pageLoad: 30000, script: 30000 });

    await step("Ouvrir AssurRec sur la page de connexion", async () => {
        await driver.get(APP_URL);
        await visible(By.css('.login-card input[type="email"]'));
        assert.equal(new URL(await driver.getCurrentUrl()).pathname, "/connexion");
        const demo = await apiGet("/api/demo-info");
        assert.equal(demo.enabled, true, "Ce parcours est réservé à la base locale de démonstration.");
    });

    await login("admin");
    await logout("administrateur");
    manager = await login("manager");

    await step("Gestionnaire : repérer une échéance dépassée sans dossier", async () => {
        const agents = await apiGet("/api/agents");
        agent = agents.find((item) => item.email === ACCOUNTS.agent && item.active);
        assert.ok(agent, `Agent de démonstration actif introuvable : ${ACCOUNTS.agent}`);
        const cases = await allItems("/api/cases");
        const alreadyUsed = new Set(cases.map((item) => Number(item.installmentId)));
        const date = new Date();
        const today = date.toISOString().slice(0, 10);
        date.setUTCDate(date.getUTCDate() - 1);
        const candidates = await allItems("/api/installments", { to: date.toISOString().slice(0, 10) });
        installment = candidates.find((item) =>
            item.dueDate < today && Number(item.balanceMilli) > 0 && !alreadyUsed.has(Number(item.id)));
        assert.ok(installment, "Aucune échéance dépassée avec dette et sans dossier. Préparer une échéance fictive admissible, sans réinitialiser la base.");
        report.installmentId = installment.id;
        await click(By.css('nav a[href="/echeances"]'));
        await fill(By.css(".search-box input"), installment.reference);
        await visible(By.xpath(`//table//td[contains(., '${installment.reference}')]`));
        console.log(`Échéance choisie : ${installment.reference}`);
    });

    await step("Gestionnaire : ouvrir le formulaire Nouveau dossier", async () => {
        await openCases();
        await click(By.xpath("//button[contains(., 'Nouveau dossier')]"));
        await visible(By.id("case-form"));
    });

    await step("Gestionnaire : rechercher l'échéance dans la liste paginée", async () => {
        await fill(By.css('#case-form .entity-select input[type="search"]'), installment.reference);
        await selectValue(field("case-form", "Échéance dépassée avec solde"), installment.id);
        const counter = await text(By.css("#case-form .entity-pagination span"));
        const pages = counter.match(/page 1\/(\d+)/);
        assert.ok(pages, "La recherche ne montre pas la première page de résultats.");
        const previous = await retry(() => driver.findElement(By.css('#case-form button[aria-label^="Résultats précédents"]')));
        const next = await retry(() => driver.findElement(By.css('#case-form button[aria-label^="Résultats suivants"]')));
        assert.equal(await previous.isEnabled(), false);
        assert.equal(await next.isEnabled(), Number(pages[1]) > 1);
    });

    await step("Gestionnaire : affecter le dossier à l'agent", () =>
        selectValue(field("case-form", "Agent affecté"), agent.id));

    await step("Gestionnaire : choisir la priorité normale et saisir les notes", async () => {
        await selectValue(field("case-form", "Priorité"), "normale");
        await fill(field("case-form", "Notes", "textarea"), NOTES);
    });

    await step("Gestionnaire : créer le dossier et vérifier son affectation", async () => {
        await click(By.css('button[form="case-form"]'));
        await formClosed("case-form");
        const cases = await allItems("/api/cases");
        recoveryCase = cases.find((item) =>
            Number(item.installmentId) === Number(installment.id) && item.notes === NOTES);
        assert.ok(recoveryCase, "Le nouveau dossier n'a pas été persisté.");
        assert.equal(Number(recoveryCase.agentId), Number(agent.id));
        assert.equal(recoveryCase.status, "nouveau");
        assert.equal(recoveryCase.priority, "normale");
        report.caseId = recoveryCase.id;
        report.caseReference = recoveryCase.reference;
        await fill(By.css(".search-box input"), recoveryCase.reference);
        await visible(By.css(`table a[href="/dossiers/${recoveryCase.id}"]`));
        console.log(`Dossier créé et affecté : ${recoveryCase.reference} → ${agent.name}`);
    });

    await logout("gestionnaire");
    const connectedAgent = await login("agent");
    assert.equal(Number(connectedAgent.id), Number(agent.id));

    await step("Agent : rechercher son dossier affecté et ouvrir la fiche", async () => {
        await findAndOpenCase();
        const detail = await apiGet(`/api/cases/${recoveryCase.id}/detail`);
        assertContext(detail);
        assert.equal(detail.case.status, "nouveau");
        const definition = await text(By.css(".detail-grid"));
        assert.ok(definition.includes(detail.insured.reference));
        assert.ok(definition.includes(detail.contract.reference));
        assert.ok(definition.includes(installment.reference));
        assert.ok(definition.includes(agent.name));
    });

    await step("Agent : prendre le dossier en charge, statut En cours", async () => {
        await click(By.xpath("//button[contains(., 'Prendre en charge')]"));
        await visible(By.xpath("//section[contains(@class, 'detail-summary')]//span[normalize-space()='En cours']"));
        const detail = await apiGet(`/api/cases/${recoveryCase.id}/detail`);
        assert.equal(detail.case.status, "en_cours");
        assertContext(detail);
    });

    await step("Agent : ouvrir le formulaire de relance du dossier", async () => {
        await click(By.xpath("//article[.//h2[normalize-space()='Relances']]//button[contains(., 'Ajouter')]"));
        await visible(By.id("reminder-form"));
        // Le dossier est verrouillé car la relance est ouverte depuis sa fiche.
        await driver.wait(async () => {
            const element = await driver.findElement(field("reminder-form", "Dossier"));
            return (await element.getAttribute("value")) === String(recoveryCase.id);
        }, TIMEOUT_MS, "Le dossier de la relance n'a pas fini de charger.");
        const caseSelect = await driver.findElement(field("reminder-form", "Dossier"));
        assert.equal(await caseSelect.getAttribute("value"), String(recoveryCase.id));
    });

    await step("Agent : choisir le canal Téléphone et saisir l'objet", async () => {
        await selectValue(field("reminder-form", "Canal indicatif"), "telephone");
        await fill(field("reminder-form", "Objet", "input"), SUBJECT);
    });

    await step("Agent : saisir la consigne et choisir Contact fictif consigné", async () => {
        await fill(field("reminder-form", "Message / consigne", "textarea"), CONTENT);
        await selectValue(field("reminder-form", "État"), "consigne");
    });

    await step("Agent : enregistrer la relance et vérifier sa persistance", async () => {
        await click(By.css('button[form="reminder-form"]'));
        await formClosed("reminder-form");
        await visible(By.xpath(`//div[contains(@class, 'reminder-item')]//strong[normalize-space()='${SUBJECT}']`));
        const detail = await apiGet(`/api/cases/${recoveryCase.id}/detail`);
        const reminder = detail.reminders.find((item) => item.subject === SUBJECT);
        assert.ok(reminder, "La relance n'a pas été persistée.");
        assert.equal(reminder.channel, "telephone");
        assert.equal(reminder.status, "consigne");
        assert.equal(Number(reminder.caseId), Number(recoveryCase.id));
        assert.equal(detail.case.status, "en_cours");
        report.reminderId = reminder.id;
        report.reminderSubject = SUBJECT;
    });

    await logout("agent");
    await login("manager");

    await step("Gestionnaire : retrouver le dossier, son statut et sa relance", async () => {
        await findAndOpenCase();
        await visible(By.xpath(`//div[contains(@class, 'reminder-item')]//strong[normalize-space()='${SUBJECT}']`));
        const detail = await apiGet(`/api/cases/${recoveryCase.id}/detail`);
        assertContext(detail);
        assert.equal(detail.case.status, "en_cours");
        const reminder = detail.reminders.find((item) => Number(item.id) === Number(report.reminderId));
        assert.ok(reminder, "La relance est absente pour le gestionnaire.");
        assert.equal(reminder.subject, SUBJECT);
        assert.equal(reminder.status, "consigne");
        assert.equal(reminder.channel, "telephone");
        const card = await text(By.xpath(`//div[contains(@class, 'reminder-item')][.//strong[normalize-space()='${SUBJECT}']]`));
        assert.ok(card.includes("Téléphone · Contact fictif consigné"), `Carte relance inattendue : ${card}`);
    });

    await step("Gestionnaire : vérifier les auteurs et dates dans l'historique", async () => {
        const detail = await apiGet(`/api/cases/${recoveryCase.id}/detail`);
        const audit = detail.audit || [];
        const managerEvent = audit.find((event) => event.entityType === "case" &&
            Number(event.entityId) === Number(recoveryCase.id) && event.action === "creation" &&
            event.actorRole === "manager" && event.actorName === manager.name);
        const agentTransition = audit.find((event) => event.entityType === "case" &&
            Number(event.entityId) === Number(recoveryCase.id) && event.action === "transition" &&
            event.actorRole === "agent" && event.actorName === agent.name &&
            event.details === "Statut nouveau vers en_cours");
        const agentReminder = audit.find((event) => event.entityType === "reminder" &&
            Number(event.entityId) === Number(report.reminderId) && event.action === "creation" &&
            event.actorRole === "agent" && event.actorName === agent.name);
        assert.ok(managerEvent, "Audit de création du gestionnaire absent.");
        assert.ok(agentTransition, "Audit de prise en charge de l'agent absent.");
        assert.ok(agentReminder, "Audit de création de la relance par l'agent absent.");

        // La section « Traçabilité / Historique » est deja affichee sous la fiche.
        const clean = (value) => String(value).replace(/\s+/g, " ").trim();
        const displayed = await retry(async () => {
            const timeline = await visibleOnce(By.css("ol.timeline"));
            await driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", timeline);
            const rows = await timeline.findElements(By.css("li"));
            const collected = [];
            for (const row of rows) {
                try {
                    collected.push({
                        label: clean(await row.findElement(By.css("strong")).getText()),
                        date: clean(await row.findElement(By.css("small")).getText()),
                        text: clean(await row.getText()),
                    });
                } catch (error) {
                    // Ligne recreee pendant la lecture : retry re-localise tout l'historique.
                    throw error;
                }
            }
            return collected;
        }, RETRIES);
        assert.ok(displayed.length >= 3, `Historique trop court (${displayed.length} lignes).`);

        for (const event of [managerEvent, agentTransition, agentReminder]) {
            assert.ok(Number.isFinite(Date.parse(event.createdAt)), "Date d'audit invalide.");
            // Même locale, même fuseau du navigateur que src/utils/format.js.
            const expectedDate = clean(await driver.executeScript(
                "return new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(arguments[0]));",
                event.createdAt,
            ));
            const expectedLabel = clean(`${event.action} · ${event.actorName}`);
            assert.ok(displayed.some((row) => row.label === expectedLabel &&
                    row.date === expectedDate && row.text.includes(clean(event.details))),
                `Action/auteur/date/détails absents ou incorrects pour l'audit ${event.id}.`);
        }
        await saveScreenshot("parcours-reussi.png");
    });

    await logout("gestionnaire final");
    report.status = "passed";
    console.log("\nRÉUSSI : parcours administrateur → gestionnaire → agent → gestionnaire terminé.");
} catch (error) {
    report.status = "failed";
    report.failedStep = currentStep;
    report.error = error.message;
    console.error(`\nÉCHEC à l'étape : ${currentStep}\n${error.message}`);
    if (driver) {
        try {
            await saveScreenshot("echec.png");
            await writeFile(path.join(RESULT_DIR, "echec.html"), await driver.getPageSource(), "utf8");
            await pause(PAUSE_MS);
        } catch (captureError) {
            console.error(`Capture indisponible : ${captureError.message}`);
        }
    }
    process.exitCode = 1;
} finally {
    report.finishedAt = new Date().toISOString();
    await mkdir(RESULT_DIR, { recursive: true });
    await writeFile(path.join(RESULT_DIR, "rapport.json"), JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log(`Rapport : ${path.join(RESULT_DIR, "rapport.json")}`);
    if (driver) {
        try { await driver.quit(); }
        catch (error) { console.error(`Fermeture Brave : ${error.message}`); }
    }
    console.log("Brave fermé par le nettoyage du test ; cela ne simule pas une déconnexion.");
}
