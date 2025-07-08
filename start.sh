#!/bin/bash

echo "🚀 Iniciando Y BACK - Sistema de Backup"
echo "======================================"

# Função para verificar se o Node.js está instalado
check_node() {
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js não encontrado. Por favor, instale o Node.js 18+ antes de continuar."
        exit 1
    fi
    echo "✅ Node.js $(node --version) encontrado"
}

# Função para instalar dependências
install_dependencies() {
    echo "📦 Instalando dependências..."
    
    # Backend
    echo "🔧 Instalando dependências do backend..."
    cd backend
    if [ ! -d "node_modules" ]; then
        npm install
    else
        echo "✅ Dependências do backend já instaladas"
    fi
    cd ..
    
    # Frontend
    echo "🎨 Instalando dependências do frontend..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    else
        echo "✅ Dependências do frontend já instaladas"
    fi
    cd ..
}

# Verificar Node.js
check_node

# Instalar dependências
install_dependencies

# Verificar se há problemas de CSS
echo "🎨 Verificando configuração do CSS..."
cd frontend
if ! npm run build --silent > /dev/null 2>&1; then
    echo "⚠️  Detectado problema com Tailwind CSS, aplicando correção..."
    cd ..
    ./fix-tailwind.sh
    echo "✅ Correção aplicada!"
else
    echo "✅ CSS configurado corretamente"
    cd ..
fi

echo ""
echo "🎯 Iniciando serviços..."
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "Usuário padrão: admin / admin123"
echo ""

# Iniciar backend em background
echo "🔧 Iniciando backend..."
cd backend
npm run dev &
BACKEND_PID=$!

# Aguardar um pouco para o backend iniciar
sleep 3

# Iniciar frontend
echo "🎨 Iniciando frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Função para limpar processos ao sair
cleanup() {
    echo ""
    echo "🛑 Parando serviços..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Capturar Ctrl+C
trap cleanup SIGINT

echo "✅ Serviços iniciados com sucesso!"
echo "📱 Acesse: http://localhost:3000"
echo "🔗 API: http://localhost:3001/api"
echo ""
echo "Pressione Ctrl+C para parar os serviços..."

# Aguardar indefinidamente
wait