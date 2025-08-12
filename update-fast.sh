#!/bin/bash

# YBACK - Sistema de Update Automático OTIMIZADO para Produção
# Versão: 2.0 - High Performance
# Autor: Sistema YBACK
# Data: $(date)
# Otimizações: Processamento paralelo, cache inteligente, verificações rápidas

set -e  # Exit on any error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações otimizadas
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
DOCKER_COMPOSE_FILE="docker-compose.yml"
HEALTH_CHECK_TIMEOUT=30  # Reduzido de 60 para 30
ROLLBACK_ENABLED=true
PARALLEL_JOBS=4  # Número de jobs paralelos
USE_CACHE=true   # Cache inteligente
SKIP_REBUILD=false  # Opção para pular rebuild se não houver mudanças nos Dockerfiles

# Função para log com timestamp e emoji
log() {
    echo -e "${BLUE}⏱️  [$(date '+%H:%M:%S')]${NC} $1"
}

# Função para sucesso
success() {
    echo -e "${GREEN}✅ [$(date '+%H:%M:%S')] $1${NC}"
}

# Função para warning
warning() {
    echo -e "${YELLOW}⚠️  [$(date '+%H:%M:%S')] $1${NC}"
}

# Função para erro
error() {
    echo -e "${RED}❌ [$(date '+%H:%M:%S')] $1${NC}"
}

# Função para info
info() {
    echo -e "${CYAN}ℹ️  [$(date '+%H:%M:%S')] $1${NC}"
}

# Função para progresso
progress() {
    echo -e "${PURPLE}🚀 [$(date '+%H:%M:%S')] $1${NC}"
}

# Função para verificar dependências em paralelo
check_dependencies_fast() {
    log "Verificação rápida de dependências..."
    
    local deps=("docker" "docker-compose" "git")
    local missing_deps=()
    
    # Verificação paralela
    for dep in "${deps[@]}"; do
        {
            if ! command -v "$dep" &> /dev/null; then
                missing_deps+=("$dep")
            fi
        } &
    done
    
    wait  # Aguardar todos os jobs paralelos
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        error "Dependências faltando: ${missing_deps[*]}"
        exit 1
    fi
    
    # Verificação rápida de espaço (sem calcular exato)
    local available_kb=$(df . | awk 'NR==2 {print $4}')
    if [ "$available_kb" -lt 1048576 ]; then  # < 1GB
        warning "Espaço em disco baixo: $((available_kb/1024/1024))GB disponível"
    fi
    
    success "Dependências OK"
}

# Função para verificar GitHub de forma inteligente
check_github_smart() {
    info "Verificando GitHub..."
    
    # Verificação rápida sem fetch completo
    if [ -n "$GITHUB_TOKEN" ] || [ -f "config/secure-config.json" ]; then
        success "Configuração GitHub detectada"
    else
        warning "Token GitHub não configurado"
    fi
}

# Verificação inteligente de atualizações
check_for_updates_smart() {
    progress "Verificando atualizações..."
    
    # Fetch mais eficiente - apenas a branch main
    git fetch origin main --depth=1 --quiet
    
    REMOTE=$(git rev-parse origin/main)
    LOCAL=$(git rev-parse HEAD)
    
    info "Local:  ${LOCAL:0:8}"
    info "Remoto: ${REMOTE:0:8}"
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        success "Sistema já atualizado ✨"
        exit 0
    else
        local changes=$(git rev-list --count HEAD..origin/main)
        progress "$changes mudanças disponíveis"
        git log --oneline --max-count=3 HEAD..origin/main
        echo ""
    fi
}

# Backup otimizado com processamento paralelo
create_backup_fast() {
    progress "Criando backup inteligente..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backups em paralelo
    {
        # Backup do banco em background
        if docker-compose ps | grep -q "yback-backend.*Up"; then
            log "Backup do banco..."
            docker-compose exec -T backend cp /app/database/database.sqlite /app/database/database.sqlite.backup 2>/dev/null
            docker-compose exec -T backend cat /app/database/database.sqlite > "$BACKUP_DIR/database.sqlite" 2>/dev/null
            success "Banco backed up"
        fi
    } &
    
    {
        # Backup dos uploads em background
        if [ -d "backend/uploads" ] && [ "$(ls -A backend/uploads 2>/dev/null)" ]; then
            log "Backup uploads..."
            tar -czf "$BACKUP_DIR/uploads_backup.tar.gz" backend/uploads/ 2>/dev/null
            success "Uploads backed up"
        fi
    } &
    
    {
        # Backup das configurações
        log "Backup configs..."
        cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null
        [ -d "nginx" ] && cp -r nginx "$BACKUP_DIR/" 2>/dev/null
        success "Configs backed up"
    } &
    
    wait  # Aguardar todos os backups terminarem
    
    success "Backup completo: $BACKUP_DIR"
}

# Download otimizado
download_updates_fast() {
    progress "Baixando atualizações..."
    
    # Stash apenas se necessário
    if ! git diff --quiet; then
        warning "Salvando mudanças locais..."
        git stash push -m "Auto-stash $(date +%H:%M:%S)" --quiet
    fi
    
    # Pull otimizado
    git pull origin main --quiet
    
    success "Atualizações baixadas"
}

# Verificar se rebuild é necessário
should_rebuild() {
    if [ "$SKIP_REBUILD" = true ]; then
        return 1  # Não fazer rebuild
    fi
    
    # Verificar se Dockerfiles mudaram
    local dockerfile_changes=$(git diff HEAD~1 --name-only | grep -E "(Dockerfile|docker-compose\.yml)" | wc -l)
    
    if [ "$dockerfile_changes" -eq 0 ] && [ "$USE_CACHE" = true ]; then
        info "Nenhuma mudança em Dockerfiles detectada"
        return 1  # Não fazer rebuild
    fi
    
    return 0  # Fazer rebuild
}

# Rebuild otimizado
rebuild_containers_smart() {
    if should_rebuild; then
        progress "Rebuilding containers..."
        
        # Build paralelo sem cache apenas quando necessário
        if [ "$USE_CACHE" = true ]; then
            docker-compose build --parallel --quiet
        else
            docker-compose build --no-cache --parallel --quiet
        fi
        
        success "Containers rebuilt"
    else
        info "Pulando rebuild (sem mudanças nos Dockerfiles)"
    fi
}

# Atualização do sistema otimizada
update_system_fast() {
    progress "Atualizando sistema..."
    
    # Down mais rápido
    log "Parando containers..."
    docker-compose down --timeout 10 --quiet || {
        warning "Forçando parada..."
        docker-compose kill --quiet
        docker-compose rm -f --quiet
    }
    
    # Up otimizado
    log "Iniciando containers..."
    docker-compose up -d --quiet --remove-orphans
    
    success "Sistema atualizado"
}

# Health check otimizado
health_check_fast() {
    progress "Verificando saúde do sistema..."
    
    # Aguardo inicial reduzido
    sleep 5
    
    # Verificar containers em paralelo
    local backend_ok=false
    local frontend_ok=false
    
    {
        # Check backend
        local count=0
        while [ $count -lt 15 ]; do  # Máximo 15 segundos
            if docker-compose exec -T backend wget --quiet --tries=1 --timeout=2 --spider http://localhost:3001/api/health 2>/dev/null; then
                backend_ok=true
                break
            fi
            count=$((count + 1))
            sleep 1
        done
    } &
    
    {
        # Check frontend
        local count=0
        while [ $count -lt 15 ]; do  # Máximo 15 segundos
            if curl -s --max-time 2 -f http://localhost:3000 >/dev/null 2>&1; then
                frontend_ok=true
                break
            fi
            count=$((count + 1))
            sleep 1
        done
    } &
    
    wait  # Aguardar ambos os checks
    
    if [ "$backend_ok" = true ] && [ "$frontend_ok" = true ]; then
        success "Sistema saudável ✨"
        return 0
    else
        error "Falha no health check"
        [ "$backend_ok" = false ] && error "Backend não respondeu"
        [ "$frontend_ok" = false ] && error "Frontend não respondeu"
        return 1
    fi
}

# Rollback rápido
rollback_fast() {
    error "Iniciando rollback..."
    
    docker-compose down --quiet
    
    # Restaurar apenas essenciais em paralelo
    {
        [ -f "$BACKUP_DIR/database.sqlite" ] && {
            mkdir -p backend/database
            cp "$BACKUP_DIR/database.sqlite" backend/database/database.sqlite
        }
    } &
    
    {
        [ -f "$BACKUP_DIR/docker-compose.yml" ] && {
            cp "$BACKUP_DIR/docker-compose.yml" ./
        }
    } &
    
    wait
    
    docker-compose up -d --quiet
    success "Rollback concluído"
}

# Limpeza otimizada
cleanup_fast() {
    info "Limpeza inteligente..."
    
    # Limpeza em background
    {
        docker system prune -f --quiet
        [ -d "backups" ] && {
            cd backups
            ls -t | tail -n +4 | xargs -r rm -rf  # Manter apenas 3 backups
            cd ..
        }
    } &
    
    wait
    success "Limpeza concluída"
}

# Função para mostrar tempo estimado
estimate_time() {
    local has_docker_changes=$1
    local estimated_time
    
    if [ "$has_docker_changes" = true ]; then
        estimated_time="3-5 minutos (rebuild necessário)"
    else
        estimated_time="1-2 minutos (sem rebuild)"
    fi
    
    info "Tempo estimado: $estimated_time"
}

# Função principal otimizada
main() {
    echo "🚀 YBACK - Sistema de Update OTIMIZADO"
    echo "====================================="
    echo "⚡ Versão High Performance 2.0"
    echo ""
    
    # Timer de início
    local start_time=$(date +%s)
    
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        error "Execute na raiz do projeto YBACK"
        exit 1
    fi
    
    # Verificações rápidas
    check_dependencies_fast
    check_github_smart
    
    # Verificar se há atualizações
    check_for_updates_smart
    
    # Estimar tempo baseado nas mudanças
    local has_docker_changes=false
    if git diff HEAD~1 --name-only | grep -qE "(Dockerfile|docker-compose\.yml)"; then
        has_docker_changes=true
    fi
    
    estimate_time "$has_docker_changes"
    
    # Confirmar
    echo ""
    warning "ATENÇÃO: Update em produção"
    echo "Opções de otimização:"
    echo "  --skip-rebuild   : Pular rebuild de containers"
    echo "  --no-cache       : Forçar rebuild sem cache"
    echo "  --auto           : Executar sem confirmação"
    echo ""
    
    if [[ "$*" != *"--auto"* ]]; then
        read -p "Continuar? (y/N): " -n 1 -r
        echo ""
        [[ ! $REPLY =~ ^[Yy]$ ]] && { log "Cancelado"; exit 0; }
    fi
    
    # Processar opções
    [[ "$*" == *"--skip-rebuild"* ]] && SKIP_REBUILD=true
    [[ "$*" == *"--no-cache"* ]] && USE_CACHE=false
    
    progress "Iniciando update otimizado..."
    
    # Pipeline otimizado
    create_backup_fast
    download_updates_fast
    rebuild_containers_smart
    update_system_fast
    
    if health_check_fast; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        success "🎉 Update concluído em ${duration}s!"
        echo ""
        echo "🌐 Sistema disponível em:"
        echo "   Frontend: http://localhost:3000"
        echo "   Backend:  http://localhost:3001"
        echo "   API:      http://localhost:3001/api/health"
        echo ""
        echo "💾 Backup: $BACKUP_DIR"
        
        # Limpeza automática se especificado
        if [[ "$*" == *"--cleanup"* ]]; then
            cleanup_fast
        else
            read -p "Executar limpeza? (y/N): " -n 1 -r
            echo ""
            [[ $REPLY =~ ^[Yy]$ ]] && cleanup_fast
        fi
        
    else
        error "Update falhou"
        
        if [ "$ROLLBACK_ENABLED" = true ]; then
            read -p "Fazer rollback? (Y/n): " -n 1 -r
            echo ""
            [[ ! $REPLY =~ ^[Nn]$ ]] && rollback_fast
        fi
        
        exit 1
    fi
}

# Tratamento de sinais
trap 'error "Update interrompido!"; exit 1' SIGINT SIGTERM

# Executar
main "$@"