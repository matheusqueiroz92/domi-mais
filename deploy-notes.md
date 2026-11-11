# Notas de Deploy — DomiMais

O site roda na VPS em um contêiner Docker (build com Node, servido por Nginx)
atrás do Traefik.

- Código-fonte na VPS: `/var/www/domi-mais`
- `docker-compose.yml`: `/opt/apps/domi-mais`
- `Dockerfile`: em `/var/www/domi-mais` (ainda não versionado no repositório)

## Antes de publicar (no computador)

```bash
npm test
npm run lint
npm run build
git push origin main
```

O build do Docker roda `npm run build`, que inclui a checagem de tipos. Se o
`npm run build` falhar localmente, o deploy também falha.

## Publicar (na VPS)

```bash
cd /var/www/domi-mais && git pull origin main
cd /opt/apps/domi-mais && docker compose up -d --build
```

O `--build` é obrigatório: sem ele o Docker reaproveita a imagem antiga. Se o
build falhar, o contêiner anterior continua no ar.

## Conferir

```bash
cd /var/www/domi-mais && git log -1 --oneline   # deve ser o último commit do GitHub
docker ps --filter name=domi-mais               # contêiner recriado há pouco
```

## Erro de Git: dubious ownership

```bash
git config --global --add safe.directory /var/www/domi-mais
```
