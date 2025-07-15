#!/bin/bash

# YBACK - Sistema de Update Automático para Produção
# Versão: 1.0
# Autor: Sistema YBACK
# Data: $(date)

set -e  # Exit on any error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
DOCKER_COMPOSE_FILE="docker-compose.yml"
HEALTH_CHECK_TIMEOUT=60
ROLLBACK_ENABLED=true

# Função para log com timestamp
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Função para sucesso
success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

# Função para warning
warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

# Função para erro
error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Função para verificar se é root ou tem sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        SUDO_CMD=""
    elif command -v sudo &> /dev/null; then
        SUDO_CMD="sudo"
    else
        error "Este script precisa de permissões de root ou sudo"
        exit 1
    fi
}

# Função para verificar dependências
check_dependencies() {
    log "Verificando dependências..."
    
    # Verificar Docker
    if ! command -v docker &> /dev/null; then
        error "Docker não está instalado"
        exit 1
    fi
    
    # Verificar Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose não está instalado"
        exit 1
    fi
    
    # Verificar Git
    if ! command -v git &> /dev/null; then
        error "Git não está instalado"
        exit 1
    fi
    
    success "Todas as dependências estão instaladas"
}

# Função para criar backup
create_backup() {
    log "Criando backup do sistema..."
    
    # Criar diretório de backup
    mkdir -p "$BACKUP_DIR"
    
    # Backup do banco de dados
    if docker-compose ps | grep -q "yback-backend.*Up"; then
        log "Fazendo backup do banco de dados..."
        docker-compose exec -T backend cp /app/database/database.sqlite /app/database/database.sqlite.backup
        docker-compose exec -T backend cat /app/database/database.sqlite > "$BACKUP_DIR/database.sqlite"
        success "Backup do banco de dados criado"
    else
        warning "Container backend não está rodando, pulando backup do banco"
    fi
    
    # Backup dos uploads
    if [ -d "backend/uploads" ]; then
        log "Fazendo backup dos uploads..."
        tar -czf "$BACKUP_DIR/uploads_backup.tar.gz" backend/uploads/ 2>/dev/null || true
        success "Backup dos uploads criado"
    fi
    
    # Backup dos auto_backups
    if [ -d "backend/auto_backups" ]; then
        log "Fazendo backup dos auto_backups..."
        tar -czf "$BACKUP_DIR/auto_backups_backup.tar.gz" backend/auto_backups/ 2>/dev/null || true
        success "Backup dos auto_backups criado"
    fi
    
    # Backup dos arquivos de configuração
    log "Fazendo backup dos arquivos de configuração..."
    cp -r backend/database "$BACKUP_DIR/" 2>/dev/null || true
    cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || true
    cp -r nginx "$BACKUP_DIR/" 2>/dev/null || true
    
    success "Backup completo criado em: $BACKUP_DIR"
}

# Função para verificar se há mudanças
check_for_updates() {
    log "Verificando se há atualizações disponíveis..."
    
    # Fetch das mudanças
    git fetch origin
    
    # Obter hash remoto do GitHub
    REMOTE=$(git rev-parse origin/main)
    
    # Obter hash atual do Docker container (se estiver rodando)
    DOCKER_HASH=""
    if docker-compose ps | grep -q "yback-backend.*Up"; then
        log "Verificando versão atual do container Docker..."
        DOCKER_HASH=$(docker-compose exec -T backend sh -c 'cd /app && git rev-parse HEAD 2>/dev/null || echo "unknown"' | tr -d '\r\n')
    else
        warning "Container backend não está rodando, usando versão local"
        DOCKER_HASH=$(git rev-parse HEAD)
    fi
    
    log "Hash no Docker: ${DOCKER_HASH:0:7}"
    log "Hash no GitHub: ${REMOTE:0:7}"
    
    if [ "$DOCKER_HASH" = "$REMOTE" ]; then
        success "Sistema já está atualizado (Docker e GitHub sincronizados)"
        exit 0
    else
        log "Novas atualizações disponíveis"
        if [ "$DOCKER_HASH" != "unknown" ]; then
            echo "Mudanças desde a versão do Docker:"
            git log --oneline ${DOCKER_HASH}..origin/main 2>/dev/null || git log --oneline -5 origin/main
        else
            echo "Últimas mudanças disponíveis:"
            git log --oneline -5 origin/main
        fi
    fi
}

# Função para baixar atualizações
download_updates() {
    log "Baixando atualizações..."
    
    # Stash mudanças locais se existirem
    if ! git diff --quiet; then
        warning "Salvando mudanças locais..."
        git stash push -m "Auto-stash antes do update $(date)"
    fi
    
    # Pull das mudanças
    git pull origin main
    
    success "Atualizações baixadas com sucesso"
}

# Função para rebuild dos containers
rebuild_containers() {
    log "Rebuilding containers..."
    
    # Build sem cache para garantir atualização
    docker-compose build --no-cache
    
    success "Containers rebuiltados com sucesso"
}

# Função para atualizar sistema
update_system() {
    log "Atualizando sistema..."
    
    # Update com zero downtime
    docker-compose up -d --force-recreate
    
    success "Sistema atualizado"
}

# Função para verificar saúde do sistema
health_check() {
    log "Verificando saúde do sistema..."
    
    # Aguardar containers iniciarem
    sleep 10
    
    # Verificar se containers estão rodando
    if ! docker-compose ps | grep -q "yback-backend.*Up"; then
        error "Container backend não está rodando"
        return 1
    fi
    
    if ! docker-compose ps | grep -q "yback-frontend.*Up"; then
        error "Container frontend não está rodando"
        return 1
    fi
    
    # Verificar health checks
    local timeout=$HEALTH_CHECK_TIMEOUT
    local count=0
    
    while [ $count -lt $timeout ]; do
        if docker-compose exec -T backend wget --quiet --tries=1 --spider http://localhost:3001/api/health 2>/dev/null; then
            success "Backend está saudável"
            break
        fi
        
        if [ $count -eq $((timeout - 1)) ]; then
            error "Backend não passou no health check"
            return 1
        fi
        
        count=$((count + 1))
        sleep 1
    done
    
    # Verificar frontend
    if docker-compose exec -T frontend wget --quiet --tries=1 --spider http://localhost:80 2>/dev/null; then
        success "Frontend está saudável"
    else
        error "Frontend não passou no health check"
        return 1
    fi
    
    success "Sistema está saudável"
}

# Função para rollback
rollback() {
    error "Iniciando rollback..."
    
    # Parar containers atuais
    docker-compose down
    
    # Restaurar banco de dados
    if [ -f "$BACKUP_DIR/database.sqlite" ]; then
        log "Restaurando banco de dados..."
        mkdir -p backend/database
        cp "$BACKUP_DIR/database.sqlite" backend/database/database.sqlite
        success "Banco de dados restaurado"
    fi
    
    # Restaurar uploads
    if [ -f "$BACKUP_DIR/uploads_backup.tar.gz" ]; then
        log "Restaurando uploads..."
        rm -rf backend/uploads
        tar -xzf "$BACKUP_DIR/uploads_backup.tar.gz" -C . 2>/dev/null || true
        success "Uploads restaurados"
    fi
    
    # Restaurar auto_backups
    if [ -f "$BACKUP_DIR/auto_backups_backup.tar.gz" ]; then
        log "Restaurando auto_backups..."
        rm -rf backend/auto_backups
        tar -xzf "$BACKUP_DIR/auto_backups_backup.tar.gz" -C . 2>/dev/null || true
        success "Auto_backups restaurados"
    fi
    
    # Restaurar configurações
    if [ -f "$BACKUP_DIR/docker-compose.yml" ]; then
        log "Restaurando docker-compose.yml..."
        cp "$BACKUP_DIR/docker-compose.yml" ./
        success "Configurações restauradas"
    fi
    
    # Iniciar sistema antigo
    docker-compose up -d
    
    success "Rollback concluído"
}

# Função para limpeza
cleanup() {
    log "Limpando recursos desnecessários..."
    
    # Limpar imagens antigas
    docker system prune -f
    
    # Limpar backups antigos (manter últimos 5)
    if [ -d "backups" ]; then
        cd backups
        ls -t | tail -n +6 | xargs -r rm -rf
        cd ..
    fi
    
    success "Limpeza concluída"
}

# Função principal
main() {
    echo "🚀 YBACK - Sistema de Update Automático"
    echo "======================================"
    echo ""
    
    # Verificar se está na raiz do projeto
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        error "Este script deve ser executado na raiz do projeto YBACK"
        exit 1
    fi
    
    # Verificar permissões
    check_permissions
    
    # Verificar dependências
    check_dependencies
    
    # Confirmar atualização
    echo ""
    warning "ATENÇÃO: Este processo irá atualizar o sistema em produção"
    read -p "Deseja continuar? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Update cancelado pelo usuário"
        exit 0
    fi
    
    # Verificar se há atualizações
    check_for_updates
    
    # Criar backup
    create_backup
    
    # Baixar atualizações
    download_updates
    
    # Rebuild containers
    rebuild_containers
    
    # Atualizar sistema
    update_system
    
    # Verificar saúde
    if health_check; then
        success "🎉 Update concluído com sucesso!"
        echo ""
        echo "Sistema atualizado e funcionando:"
        echo "- Frontend: http://localhost:3000"
        echo "- Backend: http://localhost:3001"
        echo "- API Health: http://localhost:3001/api/health"
        echo ""
        echo "Backup salvo em: $BACKUP_DIR"
        
        # Limpeza opcional
        read -p "Deseja executar limpeza do sistema? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cleanup
        fi
        
    else
        error "Update falhou na verificação de saúde"
        
        if [ "$ROLLBACK_ENABLED" = true ]; then
            read -p "Deseja fazer rollback? (Y/n): " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                rollback
            fi
        fi
        
        exit 1
    fi
}

# Tratamento de sinais
trap 'error "Update interrompido pelo usuário"; exit 1' SIGINT SIGTERM

# Executar função principal
main "$@"