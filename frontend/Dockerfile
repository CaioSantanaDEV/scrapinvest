# =========================================================================
# Multi-Stage Dockerfile para Angular 17+ (ScrapInvest Frontend)
# =========================================================================

# Estágio 1: Build da aplicação com Node.js 20 Alpine
FROM node:20-alpine AS build
WORKDIR /app

# Cache de dependências do npm
COPY package*.json ./
RUN npm ci

# Copia código-fonte e compila para produção
COPY . .
RUN npm run build -- --configuration production

# Estágio 2: Servidor Web Nginx Alpine de alta performance
FROM nginx:1.27-alpine

# Remove configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copia configuração customizada com suporte a SPA e Reverse Proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia artefatos estáticos compilados pelo Angular
COPY --from=build /app/dist/scrapinvest-frontend/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
