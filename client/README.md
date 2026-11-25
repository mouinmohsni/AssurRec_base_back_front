# AssurRec — frontend React JavaScript/JSX

Cette version conserve l’interface AssurRec : bleu encre, vert pétrole, fond ivoire, navigation latérale, dashboard et formulaires en français. Les composants et pages sont en `.jsx`, les services, hooks et utilitaires en `.js`. Aucune source TypeScript n’est nécessaire dans le client. Le backend Express/Sequelize reste indépendant et n’est pas modifié.

## 1. Remplacer uniquement le client

Arrêtez l’ancien serveur Vite avec `Ctrl+C`. Conservez une copie de l’ancien dossier `client/` hors du projet, puis remplacez **tout le dossier `client/`**, et non seulement `src/`. Cela évite de mélanger les anciens `.tsx`, `vite.config.ts` et `tsconfig.json` avec la nouvelle version.

Ne remplacez pas `server/` ni son `.env` : conservez votre configuration MySQL, votre code commenté et vos éventuelles modifications backend.

## 2. Installer et lancer

Node.js 22 ou supérieur et npm 10 ou supérieur. Depuis la racine du projet, dans un second terminal PowerShell :

```powershell
cd client
npm ci
Copy-Item .env.example .env
npm run dev
```

Si `client/.env` existe déjà, adaptez-le sans l’écraser. Le frontend écoute sur **http://localhost:3000**, le backend sur **http://localhost:4000**. Gardez le backend lancé dans son terminal avec `npm run dev` depuis `server/`.

`npm ci` installe exactement les versions du `package-lock.json` dans `client/node_modules`. Aucun package ou `node_modules` à la racine n’est nécessaire.

## 3. Connexion à l’API

En développement local :

```dotenv
API_PROXY_TARGET=http://127.0.0.1:4000
VITE_API_BASE_URL=
```

Le navigateur appelle `/api/...` sur le port 3000 ; Vite transmet ces requêtes au port 4000. Il n’y a aucun accès MySQL depuis React et aucun `DATABASE_URL` dans le client. Dans votre `server/.env`, utilisez `COOKIE_MODE=local-http` pour le HTTP local et autorisez l’origine `http://localhost:3000` dans `CORS_ORIGINS`.

Connexion par e-mail/mot de passe : cookie de session HttpOnly et `credentials: include`. Le jeton CSRF renvoyé au login ou par `/api/auth/me` reste en mémoire et accompagne les mutations dans `X-CSRF-Token`. Aucun mot de passe, cookie de session ou jeton n’est stocké dans `localStorage`.

L’aide de démonstration apparaît seulement si l’API active explicitement la démo. Le mot de passe fictif par défaut est `AssurRec-Demo-2026!`, uniquement si votre seed utilise cette valeur. Sélectionner un compte préremplit l’e-mail, sans connexion automatique.

### API sur un autre serveur

Si le backend est hébergé ailleurs, définissez dans **client/.env**, avant compilation :

```dotenv
VITE_API_BASE_URL=https://api.exemple.tn
```

La valeur est l’origine de l’API, sans `/api`. Toutes les variables `VITE_*` sont publiques et intégrées dans le JavaScript compilé : ne mettez jamais de secret dans ces variables. Redémarrez Vite après modification du `.env` ; recompilez pour une livraison de production.

Le serveur API doit autoriser l’origine HTTPS du frontend dans son CORS et configurer les cookies pour le déploiement choisi. Pour deux sites différents en HTTPS, la configuration existante `COOKIE_MODE=https-preview` utilise `SameSite=None; Secure` ; les politiques de blocage de cookies tiers du navigateur peuvent néanmoins limiter cette disposition. Le serveur hébergeant le frontend compilé doit renvoyer `index.html` pour les routes React (`/dossiers/42`, etc.), sans transformer les assets manquants ou endpoints API en pages HTML.

## 4. Architecture

```text
client/
  index.html
  package.json
  package-lock.json
  vite.config.js
  eslint.config.js
  public/                    logos, favicon et déclaration des pages
  src/
    main.jsx                 montage React
    App.jsx                  routage et contrôle d’accès des écrans
    components/common/       champs, tables, états, dialogs, sélecteur paginé
    layouts/                 navigation et cadre des listes
    context/                 session et notifications
    hooks/                   lectures API, pagination, debounce, formulaires
    services/                fetch, cookies, CSRF et authentification
    constants/               statuts, rôles, navigation
    utils/                   erreurs, dates, montants et notifications
    pages/
      login/ dashboard/ insureds/ contracts/ installments/
      cases/ payments/ reminders/ users/ audit/ errors/
    styles.css               style AssurRec conservé
```

Les formulaires sont séparés des pages de liste. Les pages sont chargées à la demande. Les sélecteurs de relations utilisent la recherche et la pagination API : une ressource n’est pas invisible parce qu’elle dépasse les 100 premiers résultats.

Les rôles organisent les écrans et boutons ; **le backend reste l’autorité de sécurité**. Administrateur : comptes et métier ; gestionnaire : métier et audit ; agent : lecture du périmètre affecté et actions de recouvrement autorisées. Les refus de règles métier renvoyés par le serveur sont affichés, notamment les suppressions liées à l’historique ou les corrections financières refusées.

Montants affichés en TND avec trois décimales. L’API reçoit des millimes entiers, et non un flottant monétaire. Paiements et relances restent fictifs, sans opération bancaire ni envoi externe.

## 5. Commandes techniques

```powershell
npm run check
npm run build
```

`check` vérifie le JavaScript/JSX avec ESLint. `build` génère `client/dist`, sans compiler le serveur. `npm run preview` sert seulement les fichiers compilés : ce n’est pas le proxy de développement vers l’API. Pour vérifier l’application locale connectée, utilisez `npm run dev`.

Les vérifications de construction sont distinguées de la future campagne de tests du module. Cette livraison ne prétend pas fournir une couverture E2E, accessibilité complète, charge, sécurité ou conformité ISO 25010.
