# Servidor do modo online do DomiMais (Node + Socket.IO).
# Usado por deploy/docker-compose.yml (contexto: a raiz do repositório).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Gera um arquivo único (server/dist/server.cjs), sem precisar de node_modules.
RUN npm run build:server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build /app/server/dist/server.cjs ./server.cjs
# Pasta do contador de partidas (volume no docker-compose), do usuário node.
RUN mkdir -p /data && chown node:node /data
ENV DATA_DIR=/data
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health > /dev/null || exit 1
CMD ["node", "server.cjs"]
