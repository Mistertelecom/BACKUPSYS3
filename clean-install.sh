#!/bin/bash

echo "🧹 Limpando e reinstalando dependências..."
echo "========================================="

# Frontend
echo "🎨 Limpando frontend..."
cd frontend
rm -rf node_modules
rm -f package-lock.json

echo "📦 Instalando dependências do frontend..."
npm install

echo "🔧 Testando TypeScript..."
if npm run type-check; then
    echo "✅ TypeScript configurado corretamente!"
    
    echo "🔧 Testando build..."
    if npm run build; then
        echo "✅ Frontend configurado corretamente!"
    else
        echo "❌ Erro no build do frontend"
        exit 1
    fi
else
    echo "❌ Erro de TypeScript"
    echo "🔧 Tentando corrigir automaticamente..."
    npm run lint:fix
    if npm run type-check; then
        echo "✅ Correções aplicadas com sucesso!"
    else
        echo "❌ Correções manuais necessárias"
        exit 1
    fi
fi

cd ..

# Backend
echo "🔧 Limpando backend..."
cd backend
rm -rf node_modules
rm -f package-lock.json

echo "📦 Instalando dependências do backend..."
npm install

echo "🔧 Testando TypeScript..."
if npm run build:check; then
    echo "✅ TypeScript configurado corretamente!"
    
    echo "🔧 Testando build..."
    if npm run build; then
        echo "✅ Backend configurado corretamente!"
    else
        echo "❌ Erro no build do backend"
        exit 1
    fi
else
    echo "❌ Erro de TypeScript no backend"
    exit 1
fi

cd ..

echo ""
echo "🎉 Instalação completa!"
echo "🚀 Execute './start.sh' para iniciar o sistema"