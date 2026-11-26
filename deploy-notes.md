# Notas de Deploy — DomiMais

O jogo roda na VPS em dois contêineres Docker, atrás do Traefik:

| Contêiner | O que é | Arquivo |
|---|---|---|
| `domi-mais` | O site (build com Node, servido pelo Nginx) | `deploy/web.Dockerfile`, `deploy/nginx.conf` |
| `domi-mais-server` | O servidor do modo online (Node + Socket.IO, porta 3001) | `deploy/server.Dockerfile` |

O Traefik manda `domimais.com.br/socket/` para o servidor e todo o resto para
o site.

- Código-fonte na VPS: `/var/www/domi-mais`
- `docker-compose.yml` em uso: `/opt/apps/domi-mais` (cópia de
  `deploy/docker-compose.yml`)

## Antes de publicar (no computador)

```bash
npm test
npm run lint
npm run build
git push origin main
```

O build do Docker roda `npm run build`, que inclui a checagem de tipos. Se o
`npm run build` falhar localmente, o deploy também falha.

## Primeira publicação do modo online (versão 0.10.0)

Feita uma vez só: troca o `docker-compose.yml` antigo (só o site) pelo novo
(site + servidor). Guarde a cópia do antigo para poder voltar atrás.

```bash
# 1. Código novo
cd /var/www/domi-mais && git pull origin main

# 2. Guarda o compose antigo e coloca o novo
cd /opt/apps/domi-mais
cp docker-compose.yml docker-compose.yml.antes-online
cp /var/www/domi-mais/deploy/docker-compose.yml docker-compose.yml

# 3. Constrói as duas imagens (se falhar, o site atual continua no ar)
docker compose build

# 4. Sobe os dois contêineres
docker compose up -d
```

O `Dockerfile` e o `nginx.conf` antigos, que ficavam soltos em
`/var/www/domi-mais`, deixam de ser usados (os novos estão em `deploy/`). Eles
não atrapalham o `git pull` e servem para voltar atrás; depois que tudo
estiver funcionando há alguns dias, podem ser apagados.

### Conferir

```bash
cd /opt/apps/domi-mais
docker compose ps
# domi-mais        Up
# domi-mais-server Up (healthy)   ← "healthy" pode levar uns 15 segundos

docker logs domi-mais-server
# [domimais] servidor online na porta 3001

curl -s "https://domimais.com.br/socket/?EIO=4&transport=polling"
# deve começar com 0{"sid":   (é o Socket.IO respondendo pelo Traefik)

curl -sI https://domimais.com.br/sw.js | grep -i cache-control
# Cache-Control: no-cache
```

Depois, no celular: abra o site, toque em "Atualizar" quando aparecer o aviso
de versão nova, crie uma sala em "Online com amigos" e entre nela de outro
aparelho (ou de uma janela anônima no computador).

### Voltar atrás

Se algo der errado, volta ao site como era (sem o modo online):

```bash
cd /opt/apps/domi-mais
cp docker-compose.yml.antes-online docker-compose.yml
docker compose up -d --build --remove-orphans
```

O `--remove-orphans` desliga o contêiner do servidor. O site volta a ser
construído com o `Dockerfile` antigo, que não liga o modo online.

### Se o modo online não conectar

- `curl` do `/socket/` devolve a página do jogo (HTML) em vez de `0{"sid"`: o
  Traefik não está mandando `/socket/` para o servidor. Veja se o contêiner
  `domi-mais-server` está `healthy` (o Traefik ignora contêiner que não
  está) e procure erros com `docker logs <contêiner do traefik> 2>&1 | grep
  domi-mais-socket`.
- Os nomes `websecure` (entrada HTTPS) e `letsencrypt` (certificados) foram
  copiados do compose antigo; se o Traefik usar outros, ajuste nos dois
  serviços.
- Para esconder o modo online sem voltar atrás: no `docker-compose.yml`,
  troque `VITE_ONLINE: "on"` por `"off"` e rode
  `docker compose up -d --build frontend`.

## Versão 0.11.0: contador de partidas (uma vez só)

O `deploy/docker-compose.yml` ganhou a rota `/api/` no Traefik e um volume
(`domi-mais-data`) para o contador de partidas. Copie o compose novo antes de
publicar:

```bash
cd /var/www/domi-mais && git pull origin main

cd /opt/apps/domi-mais
cp docker-compose.yml docker-compose.yml.antes-contador
cp /var/www/domi-mais/deploy/docker-compose.yml docker-compose.yml
docker compose up -d --build
```

Conferir:

```bash
curl -s https://domimais.com.br/api/stats
# {"matches":5000}   ← começa em 5.000 e sobe a cada partida terminada

docker logs domi-mais-server
# [domimais] partidas jogadas: 5000
```

O total fica no volume `domi-mais-data` (arquivo `stats.json`) e sobrevive a
deploys e reinícios. Para ver ou corrigir o número:

```bash
docker exec domi-mais-server cat /data/stats.json
```

Não apague o volume (`docker compose down -v` apaga): o contador voltaria a
5.000. Voltar atrás: restaure o `docker-compose.yml.antes-contador` e rode
`docker compose up -d --build` (o contador some da tela inicial).

## Publicar (depois da primeira vez)

```bash
cd /var/www/domi-mais && git pull origin main
cd /opt/apps/domi-mais && docker compose up -d --build
```

O `--build` é obrigatório: sem ele o Docker reaproveita as imagens antigas.
Se o build falhar, os contêineres anteriores continuam no ar.

Se `deploy/docker-compose.yml` mudar no repositório, copie de novo para
`/opt/apps/domi-mais` (o `CHANGELOG.md` avisa quando isso acontecer).

**Atenção:** publicar reinicia o servidor e encerra as partidas online em
andamento (as salas ficam só na memória). Publique fora do horário de aula.

## Depois de publicar: versão nova no navegador (PWA)

O jogo fica guardado no aparelho. Depois de um deploy, quem já abriu o site
continua vendo a versão antiga até o navegador baixar a nova, em segundo
plano, e mostrar o aviso **"Há uma versão nova"**. Tocar em "Atualizar"
recarrega a página na versão nova. O `deploy/nginx.conf` manda o navegador
sempre conferir o `index.html`, o `sw.js` e o manifesto, para isso acontecer
logo.

## Conferir a versão publicada

```bash
cd /var/www/domi-mais && git log -1 --oneline   # deve ser o último commit do GitHub
docker ps --filter name=domi-mais               # contêineres recriados há pouco
```

## Erros comuns

- **dubious ownership** no `git pull`:
  `git config --global --add safe.directory /var/www/domi-mais`
- **`git pull` reclama do `package-lock.json`**: não rode `npm install` em
  `/var/www/domi-mais`; desfaça com `git restore package-lock.json`.
