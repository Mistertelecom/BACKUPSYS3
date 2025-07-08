#!/bin/bash

echo "🔧 Corrigindo configuração do Tailwind CSS..."

cd frontend

# Backup dos arquivos atuais
echo "📋 Fazendo backup dos arquivos atuais..."
cp package.json package-v4.json.bak
cp postcss.config.js postcss-v4.config.js.bak
cp tailwind.config.ts tailwind-v4.config.ts.bak

echo "🔄 Aplicando versão estável (Tailwind CSS v3)..."

# Substituir pelos arquivos estáveis
cp package-stable.json package.json
cp postcss-stable.config.js postcss.config.js
cp tailwind-stable.config.ts tailwind.config.ts

# Limpar node_modules e reinstalar
echo "🧹 Limpando node_modules..."
rm -rf node_modules
rm -f package-lock.json

echo "📦 Instalando dependências..."
npm install

echo ""
echo "✅ Tailwind CSS corrigido com sucesso!"
echo "📝 Versão estável (v3) aplicada"
echo "💾 Backup dos arquivos v4 mantido"
echo ""
echo "🚀 Para testar, execute: npm run dev"