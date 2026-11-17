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

## Depois de publicar: versão nova no navegador (PWA)

Desde a 0.9.0 o jogo fica guardado no aparelho. Depois de um deploy, quem já
abriu o site antes continua vendo a versão antiga até o navegador baixar a
nova, em segundo plano, e mostrar o aviso **"Há uma versão nova"**. Tocar em
"Atualizar" recarrega a página na versão nova. Para forçar em um teste:
recarregue a página uma vez, espere o aviso e toque em "Atualizar".

O arquivo `sw.js` não pode ficar em cache longo no servidor. O Nginx padrão
não coloca cache em arquivos sem regra própria; se o `nginx.conf` tiver uma
regra de cache para `.js`, acrescente antes dela:

```nginx
location = /sw.js { add_header Cache-Control "no-cache"; }
location = /index.html { add_header Cache-Control "no-cache"; }
```

## Conferir

```bash
cd /var/www/domi-mais && git log -1 --oneline   # deve ser o último commit do GitHub
docker ps --filter name=domi-mais               # contêiner recriado há pouco
```

## Erro de Git: dubious ownership

```bash
git config --global --add safe.directory /var/www/domi-mais
```
