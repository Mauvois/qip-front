# Utilise une image officielle Node avec Alpine pour la légèreté
FROM node:20-alpine as build

# Répertoire de travail
WORKDIR /app

# Copie les fichiers nécessaires
COPY package.json package-lock.json* ./
RUN npm install

# Copie le reste du code
COPY . .

# Build du projet
RUN npm run build

# Étape de déploiement avec Nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Copie de la config nginx personnalisée (facultatif)
# COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
