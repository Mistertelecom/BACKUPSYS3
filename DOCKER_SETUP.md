# Docker Setup para Y BACK

## 🐳 Configuração de Git no Docker

Para que o módulo de atualizações funcione corretamente em containers Docker, as seguintes configurações foram implementadas:

### 1. Volumes Git no Docker Compose

```yaml
volumes:
  - ./.git:/app/.git:ro           # Repositório Git (somente leitura)
  - ./version.json:/app/version.json:ro  # Arquivo de versão
```

### 2. Arquivo version.json

Criado na raiz do projeto com informações da versão atual:

- **Versão**: Versão semântica do sistema
- **Data de atualização**: Timestamp da última atualização
- **Informações de build**: Detalhes do ambiente de construção
- **Changelog**: Histórico de mudanças

### 3. Tratamento de Erros Git

O `GitHubService` agora trata automaticamente os casos:

- **Repositório Git disponível**: Usa comandos Git normais
- **Container sem Git**: Usa informações do `version.json`
- **Erro de acesso**: Retorna informações de fallback

### 4. Comandos Docker

```bash
# Construir e iniciar
docker-compose up --build -d

# Ver logs do backend
docker-compose logs -f backend

# Parar os serviços
docker-compose down

# Reconstruir apenas o backend
docker-compose build backend && docker-compose up -d backend
```

### 5. Variáveis de Ambiente

```bash
# GitHub Integration
GITHUB_TOKEN=seu_token_aqui
GITHUB_OWNER=Mistertelecom
GITHUB_REPO=BACKUPSYS3

# Aplicação
NODE_ENV=production
PORT=3001
```

### 6. Estrutura de Arquivos

```
BACKUPSYS3/
├── .git/                    # Repositório Git (montado no container)
├── version.json            # Informações de versão (montado no container)
├── docker-compose.yml      # Configuração Docker
├── backend/
│   ├── Dockerfile          # Backend com Git instalado
│   └── src/services/GitHubService.ts  # Serviço com fallback
├── frontend/
│   └── Dockerfile          # Frontend com Git instalado
└── system_backups/         # Backups do sistema (volume)
```

## 🔧 Troubleshooting

### Erro: "not a git repository"

**Solução aplicada**:
1. Verificação prévia se está em repositório Git
2. Fallback para `version.json` se não estiver
3. Tratamento gracioso de erros

### Container não encontra version.json

```bash
# Verificar se o arquivo existe
ls -la version.json

# Recriar o container
docker-compose down
docker-compose up --build -d
```

### Logs para debug

```bash
# Backend logs
docker-compose logs -f backend | grep -i git

# Status do sistema via API
curl http://localhost:3001/api/updates/system-status
```

## 📋 Verificação da Instalação

1. ✅ Git instalado nos containers
2. ✅ Repositório Git montado como volume
3. ✅ arquivo version.json criado e montado
4. ✅ Tratamento de erro implementado no GitHubService
5. ✅ Fallback funcional para containers
6. ✅ Testes passando

Sistema agora funciona tanto em desenvolvimento (com Git) quanto em produção (containers Docker).