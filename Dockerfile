FROM node:20-alpine AS build

# Répertoire de travail
WORKDIR /app

# Copie les fichiers nécessaires
COPY package.json package-lock.json* ./
RUN npm ci

# Copie le reste du code
COPY . .

# Les requêtes API sont servies sur la même origine par Nginx.
ENV VITE_APP_BACKEND_URL=/

# Build du projet
RUN npm run build

# Étape de déploiement avec Nginx
FROM nginx:stable-alpine
ARG VCS_REF=local
LABEL org.opencontainers.image.revision=$VCS_REF
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf '%s\n' "$VCS_REF" > /usr/share/nginx/html/deployment-version.txt
COPY docker/nginx.prod.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
