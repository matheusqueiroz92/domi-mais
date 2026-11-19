# Site do DomiMais: build com Node, servido pelo Nginx.
# Usado por deploy/docker-compose.yml (contexto: a raiz do repositório).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Modo online ligado no site publicado (src/online/config.ts).
ARG VITE_ONLINE=on
ENV VITE_ONLINE=$VITE_ONLINE
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Configuração com erro faz o build falhar: o site antigo continua no ar.
RUN nginx -t
EXPOSE 80
