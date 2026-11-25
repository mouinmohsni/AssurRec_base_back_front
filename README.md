# AssurRec — recouvrement de primes d’assurance

Application pédagogique interne en français : React/TypeScript, API REST Express et MySQL. Le modèle métier suit des assurés, contrats, échéances, paiements fictifs, dossiers de recouvrement et relances fictives. Le projet est distinct de Telecom-platform ; aucun de ses dépôts n’est modifié.

Cette livraison construit la base applicative. Elle ne constitue pas une certification ISO/IEC 25010 et ne comprend pas encore la campagne des douze familles de tests demandée par le module. Les résultats réellement vérifiés pendant la construction seront précisés dans le message de livraison, sans rapport de couverture ou scanner inventé.

## Structure

`client/` contient les pages React et le client API. `server/` contient le serveur Express et les modules métier. `database/` conserve migrations SQL et amorçage fictif. `scripts/build.ts` compile les deux composants. `API_CONTRACT.md` détaille les endpoints et types. `plan.md` conserve le périmètre validé et `TODO.md` son état d’avancement.

`server/domain/recouvrement.ts` contient les règles financières pures : montant, solde, paiement, dette échue et transitions. Ces fonctions ne dépendent ni de MySQL ni d’Express ; la date courante leur est fournie explicitement. `server/app.ts` crée l’API sans ouvrir de port, tandis que `server/index.ts` s’occupe du démarrage et de l’interface. `server/services.ts` conserve l’orchestration et les requêtes SQL ; son découpage en repositories plus fins peut être poursuivi dans la phase de tests.

## Prérequis

Node.js 22 (npm 10 ou supérieur, inclus dans Node.js), MySQL 8 ou compatible. Les versions des dépendances sont figées dans `package-lock.json`. Dans un environnement local :

```bash
npm ci
cp .env.example .env
