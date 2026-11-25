# Backend et base AssurRec

Le serveur Express expose le contrat REST de `API_CONTRACT.md` et utilise MySQL/TiDB via `mysql2`, sans ORM. Les routes valident les entrées puis délèguent aux services métier et aux requêtes paramétrées. Les montants sont des entiers positifs en millimes TND, plafonnés à 2 000 000 000.

## Base

`DATABASE_URL` est requis. Après avoir préparé la base, exécuter explicitement `pnpm db:migrate` depuis `/home/ubuntu/assurrec`. Le serveur ne lance jamais de DDL au démarrage. La migration est suivie par `schema_migrations` et les tables évitent les `CHECK` SQL afin de rester compatibles avec une base MySQL managée/TiDB ; les contraintes métier sont appliquées dans les services.

Le seed fictif est également explicite : `DEMO_ENABLED=true pnpm db:seed`. Il est idempotent par marqueur de version, ne supprime ni ne réinitialise les données existantes et crée au minimum 20 assurés, 30 contrats, 60 échéances, plusieurs dossiers, paiements et relances. Les comptes de démonstration utilisent `DEMO_PASSWORD` ou le défaut synthétique `AssurRec-Demo-2026!`; le mot de passe n'est jamais renvoyé par l'API. Ne jamais utiliser ces identifiants avec des données réelles.

## Sécurité et métier

Les mots de passe sont hachés avec `scrypt` et sel. Le cookie de session contient un jeton opaque dont seul le hash est stocké en base ; il est `HttpOnly`. `COOKIE_MODE=local-http` est le seul mode autorisant le cookie local non sécurisé ; tout autre mode force `Secure; SameSite=None` pour Preview HTTPS. Les mutations authentifiées exigent `X-CSRF-Token`. La limitation de connexion est appliquée au niveau Express.

Les paiements verrouillent l'échéance avec `SELECT ... FOR UPDATE`, recalculent le solde depuis les paiements valides et refusent le surpaiement. Une annulation de paiement est append-only, réservée admin/manager ; si elle recrée une dette sur un dossier clôturé, le dossier est rouvert automatiquement en `en_cours` dans la même transaction. Toutes les mutations sensibles inscrivent un audit dans la même transaction. Un agent ne peut lire ou modifier que les dossiers qui lui sont affectés ; ce scope est appliqué dans les requêtes, pas seulement dans l'interface.
