# Notas de Deploy - DomiMais

## Erro de Git: Dubious Ownership

Se você encontrar o erro:
```
fatal: detected dubious ownership in repository at '/var/www/domi-mais'
```

### Solução Rápida:
```bash
git config --global --add safe.directory /var/www/domi-mais
```

### Verificar se funcionou:
```bash
cd /var/www/domi-mais
git pull
```

## Processo de Deploy

1. **No servidor, navegue até o diretório:**
   ```bash
   cd /var/www/domi-mais
   ```

2. **Faça pull das alterações:**
   ```bash
   git pull origin main
   ```

3. **Instale/atualize dependências (se necessário):**
   ```bash
   npm install
   ```

4. **Build da aplicação:**
   ```bash
   npm run build
   ```

5. **Reinicie o servidor (se estiver usando PM2 ou similar):**
   ```bash
   pm2 restart domi-mais
   # ou
   pm2 reload domi-mais
   ```

## Estrutura Esperada no Servidor

```
/var/www/domi-mais/
├── dist/              # Build de produção
├── node_modules/       # Dependências
├── src/                # Código fonte
├── package.json
└── ...
```

## Configuração do Servidor Web

Certifique-se de que o servidor web (Nginx/Apache) está apontando para o diretório `dist/` após o build.
