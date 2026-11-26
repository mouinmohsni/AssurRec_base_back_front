# Image contenant Node.js.
FROM node:22-alpine

# Répertoire de l'application dans le conteneur.
WORKDIR /app

# Copier les fichiers décrivant les dépendances.
# Cette séparation permet de réutiliser le cache Docker.
COPY package.json package-lock.json ./

# Installer uniquement les dépendances nécessaires à l'exécution.
RUN npm ci --omit=dev --no-fund --no-audit

# Copier le code du serveur et les scripts de base de données.
COPY src/ ./src/
COPY database/ ./database/
COPY scripts/start.js ./scripts/start.js

# Valeurs par défaut ; elles peuvent être remplacées au lancement.
ENV NODE_ENV=production
ENV PORT=4000

# Exécuter l'application sans les privilèges root.
USER node

# Indiquer le port utilisé par l'application.
EXPOSE 4000

# Démarrer uniquement l'API.
# Aucune migration ni insertion de données automatique.
CMD ["node", "src/index.js"]

