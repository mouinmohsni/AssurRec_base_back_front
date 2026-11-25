# Base de données du backend

Depuis server/, configurer DATABASE_URL dans .env puis exécuter npm run db:migrate. Le fichier 001_initial.sql décrit les tables existantes ; migrate.js transmet le DDL simple instruction par instruction avec Sequelize. Il ne fait ni DROP ni sync automatique. Le démarrage de l’API ne crée aucune table.

npm run db:seed charge explicitement des données entièrement fictives si DEMO_ENABLED=true. Le marqueur demo-001 conserve l’idempotence et la compatibilité avec le seed précédent : données et mots de passe existants ne sont pas remplacés. Le seed utilise les modèles Sequelize pour les enregistrements, et une table technique seed_markers pour son suivi.

Les modèles métier utilisent created_at sans updated_at, dates DATE exposées YYYY-MM-DD, timestamps UTC, références uniques, foreign keys et index. Les règles financières/permissions sont appliquées par les services et repos transactionnels. Les montants sont des millimes TND entiers plafonnés à 2 000 000 000.

Ne pas utiliser de vraies données ni stocker les secrets dans Git. Les commandes de migration/seed ont été exécutées sur la base de démo existante ; l’idempotence du seed a été contrôlée. La campagne de tests de portabilité et la reproduction Docker restent distinctes.
