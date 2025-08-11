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
    
    # Verificar Node.js e npm se necessário
    if [ -f "package.json" ]; then
        if ! command -v node &> /dev/null; then
            warning "Node.js não está instalado (necessário apenas para dependências do projeto)"
        fi
        if ! command -v npm &> /dev/null; then
            warning "npm não está instalado (necessário apenas para dependências do projeto)"
        fi
    fi
    
    # Verificar espaço em disco (mínimo 1GB)
    local available_space=$(df . | awk 'NR==2 {print $4}')
    local min_space=1048576  # 1GB em KB
    if [ "$available_space" -lt "$min_space" ]; then
        warning "Pouco espaço em disco disponível: $(($available_space/1024/1024))GB"
        warning "Recomendado: pelo menos 1GB livre"
    fi
    
    success "Todas as dependências estão instaladas"
}

# Função para verificar configuração GitHub
check_github_config() {
    log "Verificando configuração GitHub..."
    
    # Verificar se há token configurado
    if [ -n "$GITHUB_TOKEN" ]; then
        success "Token GitHub está configurado via variável de ambiente"
    elif [ -f "config/secure-config.json" ]; then
        success "Token GitHub pode estar configurado via interface"
    else
        warning "Token GitHub não está configurado"
        warning "Configure o token via interface em: Configurações > Integração GitHub"
        warning "Ou defina a variável GITHUB_TOKEN no docker-compose.yml"
    fi
    
    # Verificar configuração do repositório
    local current_repo=$(git config --get remote.origin.url 2>/dev/null || echo "não configurado")
    log "Repositório atual: $current_repo"
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
    
    # Parar containers antigos graciosamente
    log "Parando containers antigos..."
    docker-compose down --timeout 30 || {
        warning "Falha ao parar containers graciosamente, forçando parada..."
        docker-compose kill
        docker-compose rm -f
    }
    
    # Instalar dependências se necessário
    log "Verificando dependências do projeto..."
    if [ -f "package.json" ]; then
        npm install --production
    fi
    
    # Update com containers novos
    log "Iniciando containers atualizados..."
    docker-compose up -d --force-recreate --remove-orphans
    
    success "Sistema atualizado"
}

# Função para instalar wget nos containers se necessário
install_wget() {
    log "Verificando e instalando wget nos containers..."
    
    # Instalar wget no backend se necessário
    if docker-compose ps | grep -q "yback-backend.*Up"; then
        log "Verificando wget no container backend..."
        if ! docker-compose exec -T backend which wget >/dev/null 2>&1; then
            log "Instalando wget no backend..."
            docker-compose exec -T backend sh -c 'apt-get update && apt-get install -y wget curl' || {
                warning "Falha ao instalar wget via apt-get, tentando apk..."
                docker-compose exec -T backend sh -c 'apk update && apk add wget curl' || {
                    warning "Falha ao instalar wget, usando curl como alternativa"
                }
            }
        fi
    fi
    
    # Instalar wget no frontend se necessário
    if docker-compose ps | grep -q "yback-frontend.*Up"; then
        log "Verificando wget no container frontend..."
        if ! docker-compose exec -T frontend which wget >/dev/null 2>&1; then
            log "Instalando wget no frontend..."
            docker-compose exec -T frontend sh -c 'apt-get update && apt-get install -y wget curl' || {
                warning "Falha ao instalar wget via apt-get, tentando apk..."
                docker-compose exec -T frontend sh -c 'apk update && apk add wget curl' || {
                    warning "Falha ao instalar wget, usando curl como alternativa"
                }
            }
        fi
    fi
    
    success "Verificação de wget concluída"
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
    
    # Instalar wget se necessário
    install_wget
    
    # Verificar health checks do backend
    local timeout=$HEALTH_CHECK_TIMEOUT
    local count=0
    
    log "Testando conectividade do backend..."
    while [ $count -lt $timeout ]; do
        # Tentar wget primeiro, depois curl como fallback
        if docker-compose exec -T backend wget --quiet --tries=1 --spider http://localhost:3001/api/health 2>/dev/null; then
            success "Backend está saudável (wget)"
            break
        elif docker-compose exec -T backend curl -s -f http://localhost:3001/api/health >/dev/null 2>&1; then
            success "Backend está saudável (curl)"
            break
        elif [ $count -eq $((timeout - 1)) ]; then
            error "Backend não passou no health check após $timeout segundos"
            log "Tentando diagnóstico adicional..."
            docker-compose logs --tail=10 backend
            return 1
        fi
        
        count=$((count + 1))
        if [ $((count % 10)) -eq 0 ]; then
            log "Aguardando backend... ($count/$timeout)"
        fi
        sleep 1
    done
    
    # Verificar frontend
    log "Testando conectividade do frontend..."
    local frontend_ok=false
    if docker-compose exec -T frontend wget --quiet --tries=1 --spider http://localhost:80 2>/dev/null; then
        success "Frontend está saudável (wget)"
        frontend_ok=true
    elif docker-compose exec -T frontend curl -s -f http://localhost:80 >/dev/null 2>&1; then
        success "Frontend está saudável (curl)"
        frontend_ok=true
    else
        # Tentar teste externo via host
        if curl -s -f http://localhost:3000 >/dev/null 2>&1; then
            success "Frontend está saudável (teste externo)"
            frontend_ok=true
        else
            error "Frontend não passou no health check"
            log "Tentando diagnóstico adicional..."
            docker-compose logs --tail=10 frontend
            return 1
        fi
    fi
    
    # Verificar conectividade entre containers
    log "Testando conectividade entre containers..."
    if docker-compose exec -T frontend sh -c 'wget --quiet --tries=1 --spider http://backend:3001/api/health 2>/dev/null || curl -s -f http://backend:3001/api/health >/dev/null'; then
        success "Conectividade interna está funcionando"
    else
        warning "Conectividade interna pode ter problemas, mas containers estão rodando"
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
    
    # Verificar configuração GitHub
    check_github_config
    
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