# Contrat REST AssurRec — commun aux deux composants

Toutes les URLs frontend sont relatives `/api/...`. Une vraie session e-mail/mot de passe est obligatoire. JSON camelCase. Erreur `{error:{code:string,message:string,fields?:Record<string,string>}}`, codes HTTP 400 validation, 401 non connecté, 403 refus, 404 absent/dossier non affecté, 409 conflit métier, 500 erreur sans secret. Listes `{items:T[],total:number,page:number,pageSize:number}` ; `page=1`, `pageSize=10` (max100), `search`, filtres indiqués. Mutation retourne la ressource ; suppression `{ok:true}`.

## Types

Identifiants numériques. Dates SQL DATE exposées `YYYY-MM-DD` ; timestamps ISO UTC. Montants en **millimes entiers TND** : suffixe `Milli`, affichage trois décimales. Le frontend transforme un montant saisi (ex. `120.500`) en 120500 millimes ; le serveur valide entier positif/safe, aucune conversion flottante d’une somme financière.

`Role = admin | manager | agent`.
`InsuranceType = auto | sante | habitation | vie | professionnelle`.
`CaseStatus = nouveau | en_cours | promesse_paiement | cloture`.
`Priority = basse | normale | haute`.
`ReminderChannel = telephone | email | courrier | sms` (canal indicatif, aucun envoi réel).

- User : `id,name,email,role,active,createdAt`. Mot de passe jamais retourné.
- Insured : `id,reference,name,email,phone,address,active,createdAt`.
- Contract : `id,reference,insuredId,insuredName,insuranceType,startDate,endDate,status,createdAt`, status `actif | expire | resilie` (statut interne pas d’effet juridique automatisé).
- Installment : `id,reference,contractId,contractReference,insuredId,insuredName,insuranceType,dueDate,amountMilli,paidMilli,balanceMilli,status,createdAt`. Status dérivé `a_venir | impaye | partiel | regle`; une échéance due aujourd’hui n’est pas dépassée. Le nom payé n’implique pas l’encaissement bancaire.
- RecoveryCase : `id,reference,installmentId,installmentReference,insuredId,insuredName,contractReference,insuranceType,agentId:number|null,agentName:string|null,status,priority,openedAt,promiseDate:string|null,notes,amountMilli,paidMilli,balanceMilli,dueDate`.
- Payment : `id,reference,installmentId,installmentReference,insuredName,caseId:number|null,amountMilli,paidAt,method,status,recordedBy,recordedByName,reversalReason:string|null,createdAt`, method `virement | cheque | especes`, status `valide | annule`. Enregistrement fictif, pas de débit réel.
- Reminder : `id,caseId,caseReference,insuredName,channel,subject,content,status,scheduledDate:string|null,createdByName,createdAt`, status `brouillon | consigne`. `consigne` signifie contact fictif enregistré, pas message envoyé.
- AuditEvent : `id,actorName,actorRole,action,entityType,entityId:number|null,details,createdAt`. Aucun jeton ni mot de passe dans détails.

## Connexion

- POST `/api/auth/login` `{email,password}` → `{user:User,csrfToken:string}` + cookie HttpOnly opaque.
- GET `/api/auth/me` → `{user:User,csrfToken:string}` ou401.
- POST `/api/auth/logout` → `{ok:true}`.
- Header `X-CSRF-Token` obligatoire pour toutes mutations authentifiées (logout inclus). Pas de CORS permissif. Utiliser `credentials:'include'` dans fetch.
- GET `/api/agents` → `User[]` actifs rôle agent ; manager/admin, agent renvoie lui-même seulement.
- GET `/api/demo-info` → `{enabled:boolean,accounts?:{email:string,name:string,role:Role}[]}` ; pas de mot de passe renvoyé. Option d’aide login uniquement si demo explicite. Une seule valeur de mot de passe fictif sera fournie séparément par le seed/README, jamais une session bypass.

## Ressources

Routes listes GET et détail GET `/:id`. Agent seulement données associées à ses dossiers, backend enforce. Admin/manager écrivent assurés/contrats/échéances et affectent dossiers ; agent ne modifie pas masterdata.

- `/api/insureds` GET/POST ; `/:id` GET/PUT/DELETE. POST/PUT champs `{reference,name,email,phone,address,active?}`. DELETE seulement si aucune relation, sinon409 ; archive via active=false pour garder historique.
- `/api/contracts` GET/POST ; `/:id` GET/PUT/DELETE. Filtres `insuredId,insuranceType,status`. Corps `{reference,insuredId,insuranceType,startDate,endDate,status}`. Suppression seulement sans échéance ; date modifiée ne doit pas rendre les échéances existantes invalides.
- `/api/installments` GET/POST ; `/:id` GET/PUT/DELETE. Filtres `contractId,insuredId,status,from,to`. Corps `{reference,contractId,dueDate,amountMilli}`. Échéance dans la période du contrat ; modification seulement sans paiement enregistré ; suppression seulement sans paiement/dossier.
- `/api/cases` GET/POST ; `/:id` GET/PUT/DELETE. Filtres `status,agentId,priority,insuranceType,from,to`. Création `{installmentId,agentId:number|null,priority,notes}` : échéance dépassée avec dette, aucun dossier existant. PUT `{agentId?,priority?,notes?}` : agent peut seulement priority/notes sur son dossier ; réaffectation manager/admin. DELETE uniquement nouveau sans paiements/relances. Création seulement manager/admin.
- POST `/api/cases/:id/transition` `{status,promiseDate?}`. Nouveau→en_cours ; en_cours→promesse_paiement ; promesse_paiement→en_cours ; en_cours/promesse→cloture si solde=0. Nouveau peut être clôturé si solde=0. Cloture→en_cours uniquement manager/admin après annulation créant dette. Date de promesse aujourd’hui/future requise pour promesse. Aucun effet bancaire ou juridique.
- GET `/api/cases/:id/detail` → `{case:RecoveryCase,insured:Insured,contract:Contract,installment:Installment,payments:Payment[],reminders:Reminder[],audit:AuditEvent[]}`. Scope audit uniquement ressources du dossier. Priorité statuts contrôlés au backend.
- `/api/payments` GET/POST ; `/:id` GET. Filtres `installmentId,caseId,from,to,status`. POST `{installmentId,amountMilli,paidAt,method,reference}`. Montant<=solde dans transaction avec verrou. Agent seulement échéance liée à son dossier. En cas de solde=0, le dossier n’est pas automatiquement clôturé : action explicite conditionnelle.
- POST `/api/payments/:id/reverse` `{reason}` réservé manager/admin ; annulation tracée une seule fois ; bloque tant que dossier clôturé pour maintenir invariant clôture/dette, ou réouvre automatiquement le dossier dans la même transaction et audite la réouverture. CHOIX canonique : réouverture automatique en_cours si un dossier clôturé retrouve un solde positif, action du manager/admin audité. Historique conservé.
- `/api/reminders` GET/POST ; `/:id` GET/PUT/DELETE. Filtres `caseId,status,channel`. Corps `{caseId,channel,subject,content,status,scheduledDate?}`. Agent seulement son dossier, dossier non clôturé ; brouillon modifiable/supprimable, consigne immuable. Création brouillon ou consigne, jamais message externe envoyé.
- `/api/users` GET/POST ; `/:id` PUT/DELETE admin uniquement, filtres `role,search`. Corps création `{name,email,role,password,active?}` ; PUT `{name?,email?,role?,active?,password?}`. DELETE désactive pour garder audit ; au moins un admin actif ; changements de rôle protégés contre retrait des permissions du dernier admin, ne désactive pas agent ayant dossier actif sans réaffectation ; pas d’inscription publique.
- `/api/audit` GET only manager/admin ; filtres `search,entityType,from,to` ; aucun update/delete.

## Dashboard

GET `/api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD&insuranceType=...&agentId=...` scope agent obligatoire sur soi. Période appliquée aux échéances par dueDate et paiements par paidAt ; dossier par son échéance (ce choix doit figurer dans l’UI).

Réponse :
```
{
  kpis:{outstandingMilli:number,collectedMilli:number,overdueCount:number,activeCases:number,recoveryRate:number},
  monthly:{month:string,expectedMilli:number,collectedMilli:number}[],
  aging:{label:string,amountMilli:number,count:number}[],
  byStatus:{status:CaseStatus,count:number}[],
  priorityCases:RecoveryCase[],
  recentPayments:Payment[]
}
```
RecoveryRate = paiements valides rattachés aux échéances filtrées / total de ces échéances *100 ; préciser ce dénominateur. Monthly 6 derniers mois ou période choisie ; montants calculés API. Aging `1–30 jours`, `31–60 jours`, `61–90 jours`, `Plus de90 jours`. Aucune valeur figée frontend.

GET `/api/health` → `{status:'ok',database:'connected'}` ou503 si DB inaccessible. Routes frontend : `/connexion`, `/`, `/assures`, `/contrats`, `/echeances`, `/dossiers`, `/dossiers/:id`, `/paiements`, `/relances`, `/audit`, `/utilisateurs`, `/404`. Toutes protégées sauf connexion/404. Aucun lien Preview dans README.
