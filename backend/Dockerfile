# Dockerfile para Backend Node.js
FROM node:20-bullseye-slim

# Instalar dependências do sistema necessárias para SSH, SQLite e health checks
RUN apt-get update && apt-get install -y \
    openssh-client \
    iputils-ping \
    bash \
    sqlite3 \
    libsqlite3-dev \
    python3 \
    make \
    g++ \
    wget \
    curl \
    git \
    tar \
    gzip \
    && rm -rf /var/lib/apt/lists/*

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências com configurações específicas para Alpine
RUN npm ci --verbose
# Recompilar dependências nativas individualmente
RUN npm rebuild sqlite3 --verbose
RUN npm rebuild ssh2 --verbose || echo "ssh2 rebuild failed, continuing..."
RUN npm rebuild node-ssh --verbose || echo "node-ssh rebuild failed, continuing..."

# Copiar código fonte
COPY . .

# Criar diretórios necessários
RUN mkdir -p uploads auto_backups database

# Compilar TypeScript
RUN npm run build

# Expor porta
EXPOSE 3001

# Variáveis de ambiente
ENV NODE_ENV=production
ENV DATABASE_PATH=/app/database/database.sqlite
ENV AUTO_BACKUP_DIR=/app/auto_backups

# Comando para iniciar com código compilado
CMD ["node", "dist/app.js"]