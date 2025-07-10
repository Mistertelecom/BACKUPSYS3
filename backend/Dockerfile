# Dockerfile para Backend Node.js
FROM node:18-alpine

# Instalar dependências do sistema necessárias para SSH e outras operações
RUN apk add --no-cache openssh-client bash

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

# Criar diretórios necessários
RUN mkdir -p uploads auto_backups database

# Compilar TypeScript
RUN npm run build 2>/dev/null || echo "Build script not found, using ts files directly"

# Expor porta
EXPOSE 3001

# Variáveis de ambiente
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/database/database.sqlite
ENV AUTO_BACKUP_DIR=/app/auto_backups

# Comando para iniciar
CMD ["npm", "start"]