# Étape 1 : compiler l'application React.
FROM node:22-alpine AS build

WORKDIR /app

# Installer les versions exactes des dépendances.
COPY package.json package-lock.json ./
RUN npm ci --no-fund --no-audit

# Copier les sources du frontend.
COPY . .

# Le navigateur appellera /api sur l'origine du frontend.
# Nginx transmettra ces requêtes au serveur.
ENV VITE_API_BASE_URL=""

# Générer les fichiers compilés dans /app/dist.
RUN npm run build


# Étape 2 : servir les fichiers compilés avec Nginx.
FROM nginx:stable-alpine

# Remplacer la configuration Nginx par défaut.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier uniquement le résultat de la compilation.
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx écoute sur 80 à l'intérieur du conteneur.
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

