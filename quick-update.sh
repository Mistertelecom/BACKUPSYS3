#!/bin/bash

# YBACK - Quick Update Profiles
# Diferentes perfis de velocidade para diferentes cenários

set -e

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Função de ajuda
show_help() {
    echo "🚀 YBACK Quick Update - Perfis de Velocidade"
    echo "============================================"
    echo ""
    echo "Uso: $0 [perfil] [opções]"
    echo ""
    echo "PERFIS DISPONÍVEIS:"
    echo "  lightning  🌩️  - Ultra rápido (30-60s) - Apenas código, sem rebuild"
    echo "  fast       ⚡   - Rápido (1-2min) - Com cache inteligente"
    echo "  safe       🛡️   - Seguro (2-3min) - Rebuild completo + validações"
    echo "  production 🏭   - Produção (3-5min) - Máxima segurança"
    echo ""
    echo "OPÇÕES:"
    echo "  --auto       - Executar sem confirmação"
    echo "  --cleanup    - Limpeza automática após update"
    echo "  --no-backup  - Pular backup (apenas para lightning/fast)"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0 lightning --auto         # Update ultra rápido"
    echo "  $0 fast --cleanup           # Update rápido com limpeza"
    echo "  $0 safe                     # Update seguro"
    echo "  $0 production --auto        # Update produção automatizado"
    echo ""
}

# Perfil Lightning - Ultra rápido
run_lightning() {
    echo -e "${BLUE}🌩️  LIGHTNING MODE - Ultra Rápido${NC}"
    echo "Tempo estimado: 30-60 segundos"
    echo ""
    
    local args="--skip-rebuild --auto"
    [[ "$*" == *"--no-backup"* ]] && args="$args --no-backup"
    [[ "$*" == *"--cleanup"* ]] && args="$args --cleanup"
    
    # Verificação mínima
    if ! git diff --quiet HEAD origin/main 2>/dev/null; then
        git fetch origin main --quiet
        if ! git diff --quiet HEAD origin/main; then
            echo "⚡ Executando update lightning..."
            ./update-fast.sh $args
        else
            echo -e "${GREEN}✅ Já atualizado!${NC}"
        fi
    else
        echo -e "${GREEN}✅ Sistema já está na versão mais recente!${NC}"
    fi
}

# Perfil Fast - Rápido com cache
run_fast() {
    echo -e "${BLUE}⚡ FAST MODE - Rápido${NC}"
    echo "Tempo estimado: 1-2 minutos"
    echo ""
    
    local args=""
    [[ "$*" == *"--auto"* ]] && args="$args --auto"
    [[ "$*" == *"--cleanup"* ]] && args="$args --cleanup"
    [[ "$*" == *"--no-backup"* ]] && args="$args --no-backup"
    
    ./update-fast.sh $args
}

# Perfil Safe - Seguro
run_safe() {
    echo -e "${YELLOW}🛡️  SAFE MODE - Seguro${NC}"
    echo "Tempo estimado: 2-3 minutos"
    echo ""
    
    local args="--no-cache"
    [[ "$*" == *"--auto"* ]] && args="$args --auto"
    [[ "$*" == *"--cleanup"* ]] && args="$args --cleanup"
    
    ./update-fast.sh $args
}

# Perfil Production - Máxima segurança
run_production() {
    echo -e "${RED}🏭 PRODUCTION MODE - Máxima Segurança${NC}"
    echo "Tempo estimado: 3-5 minutos"
    echo ""
    
    echo "✓ Backup completo"
    echo "✓ Rebuild sem cache"
    echo "✓ Validações estendidas"
    echo "✓ Rollback automático em caso de falha"
    echo ""
    
    local args="--no-cache"
    [[ "$*" == *"--auto"* ]] && args="$args --auto"
    [[ "$*" == *"--cleanup"* ]] && args="$args --cleanup"
    
    # Usar script original para máxima segurança
    ./update.sh
}

# Verificar qual script usar
check_scripts() {
    if [ ! -f "update-fast.sh" ]; then
        echo -e "${RED}Erro: update-fast.sh não encontrado${NC}"
        echo "Usando script padrão..."
        if [ ! -f "update.sh" ]; then
            echo -e "${RED}Erro: Nenhum script de update encontrado!${NC}"
            exit 1
        fi
    fi
    
    # Tornar scripts executáveis
    chmod +x update-fast.sh 2>/dev/null || true
    chmod +x update.sh 2>/dev/null || true
}

# Mostrar status do sistema
show_status() {
    echo "📊 Status do Sistema:"
    echo "─────────────────────"
    
    # Verificar se containers estão rodando
    if command -v docker-compose &> /dev/null; then
        if docker-compose ps | grep -q "Up"; then
            echo -e "🟢 Containers: ${GREEN}Rodando${NC}"
        else
            echo -e "🔴 Containers: ${RED}Parados${NC}"
        fi
    fi
    
    # Verificar versão atual vs remota
    if command -v git &> /dev/null && [ -d ".git" ]; then
        git fetch origin main --quiet 2>/dev/null || true
        local local_hash=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
        local remote_hash=$(git rev-parse origin/main 2>/dev/null || echo "unknown")
        
        if [ "$local_hash" = "$remote_hash" ]; then
            echo -e "✅ Versão: ${GREEN}Atualizada${NC} (${local_hash:0:8})"
        else
            local commits_behind=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "?")
            echo -e "🔄 Versão: ${YELLOW}${commits_behind} commits atrás${NC}"
            echo -e "   Local:  ${local_hash:0:8}"
            echo -e "   Remoto: ${remote_hash:0:8}"
        fi
    fi
    
    echo ""
}

# Função principal
main() {
    local profile=${1:-help}
    shift 2>/dev/null || true
    
    case $profile in
        lightning)
            check_scripts
            run_lightning "$@"
            ;;
        fast)
            check_scripts
            run_fast "$@"
            ;;
        safe)
            check_scripts
            run_safe "$@"
            ;;
        production)
            check_scripts
            run_production "$@"
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo -e "${RED}Perfil inválido: $profile${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Executar
main "$@"