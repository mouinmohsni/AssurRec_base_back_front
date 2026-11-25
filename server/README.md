# AssurRec — backend JavaScript ESM + Sequelize

Backend indépendant de recouvrement de primes d’assurance impayées. Il utilise **Node.js 22**, **Express 5**, **Sequelize 6**, **MySQL 8 ou compatible** et **npm**. Aucun TypeScript, React ou Vite n’est nécessaire pour installer ou démarrer ce serveur.

Cette livraison termine la base applicative du backend. Elle ne constitue pas une certification ISO/IEC 25010 ni la campagne automatisée du module, qui sera construite ensuite. Les données et paiements restent entièrement fictifs ; aucun e-mail, SMS, débit bancaire ou acte juridique n’est effectué.

## 1. Installer et démarrer

Prérequis : Node.js 22 avec npm 10 ou supérieur et une base MySQL dédiée existante. Le package-lock.json est fourni ; npm ci installe les versions verrouillées.

Dans PowerShell, depuis le dossier extrait contenant server/ :

```powershell
cd server
npm ci
Copy-Item .env.example .env
```

**Si .env existe déjà, ne pas le remplacer** : adapter seulement les variables nécessaires. Modifier DATABASE_URL pour utiliser les identifiants de sa base MySQL locale. Ne pas mettre des identifiants réels dans Git. Par exemple, l’URL ci-dessous doit correspondre à un utilisateur et une base que tu as réellement créés :

```dotenv
PORT=4000
DATABASE_URL=mysql://assurrec:change_me@127.0.0.1:3306/assurrec
COOKIE_MODE=local-http
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
DEMO_ENABLED=true
DEMO_PASSWORD=AssurRec-Demo-2026!
```

Un mot de passe contenant des caractères réservés dans une URL doit être encodé. COOKIE_MODE=local-http convient seulement à localhost en HTTP ; pour HTTPS, choisir https-preview, qui configure Secure et SameSite=None. Pour MySQL distant TLS, activer DB_TLS=true ; TiDB Cloud active TLS avec vérification du certificat automatiquement.

Préparer les tables et les données fictives, puis lancer le serveur :

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

Vérifier ensuite **http://localhost:4000/api/health**, qui doit renvoyer :

```json
{"status":"ok","database":"connected"}
```

Sous Linux/macOS, remplacer Copy-Item par cp. Les commandes npm sont identiques. Le mode dev utilise node --watch, sans nodemon ni compilation TypeScript.

## 2. Arborescence et responsabilités

```text
server/
├── package.json / package-lock.json
├── .env.example
├── src/
│   ├── config/          connexion Sequelize, environnement et valeurs partagées
│   ├── models/          modèles et associations des tables existantes
│   ├── repositories/    accès ORM, jointures, scopes, agrégats et verrous
│   ├── services/        orchestration des règles métier et transactions
│   ├── dto/             schémas d’entrée et mappers de sortie explicites
│   ├── middlewares/     session, rôles, CSRF, validation, erreurs, limite d’essais
│   ├── controllers/     lecture de la requête et réponse HTTP
│   ├── routes/          endpoints REST et chaîne de middlewares
│   ├── domain/          règles financières pures et déterministes
│   ├── utils/           erreurs et pagination communes
│   ├── app.js           construit Express sans écouter un port
│   └── index.js         ouvre le port et gère l’arrêt
├── database/            migration SQL/JS et seed explicites
└── scripts/             vérification syntaxe/lint et démarrage production
```

Chemin d’une requête : **route → middlewares → controller → service → repository → modèle Sequelize → MySQL**, puis DTO de sortie → réponse JSON. Les contrôleurs ne contiennent pas de SQL. Les requêtes usuelles utilisent les modèles Sequelize. Les agrégats complexes du dashboard et les scopes SQL ciblés restent isolés dans repositories/ avec paramètres échappés/validés.

Le nom français d’un modèle ne renomme pas sa table : Assure correspond à insureds, Contrat à contracts, Echeance à installments, Dossier à recovery_cases, Paiement à payments, Relance à reminders, Utilisateur à users, Session à sessions et AuditEvent à audit_events. Les associations sont déclarées dans models/index.js. Les tables de suivi de migration et seed restent des tables techniques.

Les attributs et JSON restent en camelCase (insuredId, amountMilli, createdAt), tandis que les colonnes MySQL conservent snake_case. Les tables ont created_at, sans updated_at. Les identifiants BIGINT sont convertis en nombres sûrs dans les DTO ; les montants sont plafonnés et stockés en millimes entiers, jamais en flottants.

## 3. Comptes et permissions

Le seed crée les comptes fictifs suivants avec le mot de passe défini lors du premier seed par DEMO_PASSWORD, par défaut **AssurRec-Demo-2026!** :

| Profil | E-mail | Périmètre |
|---|---|---|
| Administrateur | admin@assurrec.demo | Comptes, rôles et supervision |
| Gestionnaire | gestionnaire@assurrec.demo | Référentiels, affectation, suivi et corrections |
| Agent | agent@assurrec.demo | Dossiers affectés et ressources associées |

Un second agent fictif agent2@assurrec.demo permet la vérification des affectations. Aucune inscription publique ni promotion de rôle à la connexion. Les contrôles sont côté serveur, et un filtre agentId ne permet pas de remplacer le périmètre de l’agent connecté.

La connexion est réelle : mot de passe scrypt salé, cookie de session opaque HttpOnly dont seul le hash est stocké, session de 12 heures et limitation des essais. La réponse de connexion contient csrfToken ; toutes les mutations authentifiées, logout compris, exigent le header X-CSRF-Token. Ce jeton reste stable durant une session. Les DTO utilisateur n’exposent jamais passwordHash, tokenHash ou les valeurs privées de session.

## 4. Endpoints et contrat

[API_CONTRACT.md](./API_CONTRACT.md) décrit les champs, filtres, statuts et réponses. Préfixe /api ; endpoints anglais conservés pour ne pas casser le futur raccordement du client.

| Groupe | Endpoints |
|---|---|
| Authentification | POST /auth/login, GET /auth/me, POST /auth/logout |
| Aide démo/santé | GET /demo-info, GET /health |
| Référentiels | /insureds, /contracts, /installments : GET/POST et GET/PUT/DELETE /:id |
| Dossiers | /cases : CRUD ; POST /:id/transition ; GET /:id/detail |
| Paiements | GET/POST /payments, GET /payments/:id, POST /payments/:id/reverse |
| Relances | /reminders : CRUD sous contraintes |
| Administration | /users : GET/POST et PUT/DELETE /:id ; GET /agents |
| Reporting | GET /dashboard, GET /audit |

DELETE /users/:id désactive le compte pour conserver l’historique. Il n’existe pas de DELETE des paiements ni de mutation de l’audit. Un endpoint inconnu retourne une erreur JSON, pas la page du frontend.

Les listes sont paginées côté base (page=1, pageSize=10, maximum100) et retournent items,total,page,pageSize. Dates : YYYY-MM-DD ; timestamps : ISO UTC. L’API utilise les réponses de validation 400, session 401, droits 403, ressource/scopes 404 et conflit métier 409.

## 5. Règles métier conservées

Un paiement doit être positif et ne pas dépasser le solde courant ; les paiements partiels sont autorisés. Un dossier exige une échéance dépassée avec dette et ne peut pas doubler un dossier actif. La clôture est explicite et exige un solde nul. Une annulation motivée, manager/admin seulement, conserve le paiement et réouvre automatiquement le dossier si la dette réapparaît, avec audit dans la même transaction.

Les transactions Sequelize utilisent READ COMMITTED et un ordre de verrous commun : échéance, dossier, paiements. La somme des paiements valides est relue après les verrous. Les dates des contrats ne peuvent pas invalider des échéances existantes ; une échéance liée à un paiement ou à un dossier ne peut pas être modifiée comme un simple champ de formulaire. Les suppressions de référentiels vérifient leurs dépendances.

L’affectation exige un agent actif. Un agent ayant des dossiers actifs ne peut pas être désactivé ou perdre son rôle avant réaffectation ; le dernier administrateur actif est protégé. Les relances brouillon sont modifiables/supprimables sur dossier non clôturé ; consigne signifie un contact fictif immuable, jamais un message envoyé.

La période dashboard sélectionne les échéances par dueDate, les paiements par paidAt et les dossiers par leur échéance. L’encours représente la dette actuelle des échéances filtrées ; le taux rapporte leurs paiements valides au principal de ces échéances. Le journal d’audit possède une borne de fin de période inclusive et le détail d’un dossier ne retourne que les audits de ses ressources.

## 6. Base, indépendance et production

Le serveur ne fait jamais sequelize.sync(), ne crée aucune table et ne lance pas le seed au démarrage. db:migrate applique le schéma versionné de manière idempotente. db:seed conserve un marqueur et ne remplace pas les comptes/mots de passe existants ; modifier DEMO_PASSWORD ensuite ne réinitialise pas les comptes. Les données fictives existantes sont conservées.

Le backend possède son package.json, package-lock.json, node_modules et .env. Aucun package.json/node_modules n’est nécessaire à la racine et aucune dépendance n’est importée depuis client/. En développement, l’API écoute sur4000 ; le futur Vite sur3000 utilise le proxy /api→4000. La configuration client minimale a été adaptée, mais ses pages/composants n’ont pas été modifiés.

Pour démarrer l’API en production locale :

```powershell
npm start
```

Dans le projet complet, les scripts racine **node scripts/build.mjs** puis **node scripts/start.mjs** installent les deux packages séparément, compilent le client existant et lancent le processus unique sur3000. Ces scripts .mjs ne requièrent aucun package.json ni node_modules commun.

JavaScript s’exécute directement : aucune commande build du serveur n’est nécessaire. FRONTEND_DIST vide conserve une API seule. Pour l’option de production validée (un processus servant aussi le client compilé), fournir un **chemin absolu** vers un dossier contenant index.html. L’API sert ces fichiers, mais ne construit ni n’importe le frontend. Le Dockerfile à la racine du projet complet construit séparément client et serveur puis livre un conteneur unique ; server/Dockerfile permet une image API seule. Aucune publication effectuée.

## 7. Vérifications de cette livraison

npm ci, npm run check, migration JS et seed idempotent ont été exécutés. Le contrôle check utilise la syntaxe Node et ESLint (variables non définies, syntaxe et erreurs simples), pas TypeScript. Un parcours API ciblé a contrôlé les trois connexions, permissions, scope agent, listes et filtres réels, CRUD référentiels/utilisateurs/relances, paiement partiel, surpaiement refusé, promesse, clôture, correction/double correction refusée et audit.

Il s’agit de vérifications de construction, **pas d’une campagne complète de tests**. Aucune campagne SAST/SCA/DAST du module, test E2E navigateur, mesure de couverture, expérience de concurrence/charge ni lancement Windows/Docker n’a été effectué ici. La sûreté de concurrence est implémentée avec transactions/verrous mais reste à éprouver dans la prochaine phase. Les données de contrôle portent VERIF- ou MVC- et conservent leurs audits fictifs.

L’installation signale encore des avertissements de dépréciation (dottie et la version ESLint épinglée). Les alertes de sécurité remontées automatiquement par npm ont été traitées : express-rate-limit8.7.4, mysql2 3.24.6, Zod4.6.7 et uuid11.1.1 compatible CommonJS épinglé pour Sequelize. Le dernier **npm audit retourne0alerte connue**, y compris les dépendances de développement. Ce contrôle du registre npm n’est pas une campagne SCA complète et ne garantit pas l’absence de vulnérabilités. La campagne SCA/SAST/DAST avec les outils du cours reste à réaliser. Les scripts de production racine ont été exécutés ; Docker et Windows ne l’ont pas été.
