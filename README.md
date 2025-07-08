# 📦 Y BACK - Sistema de Backup para Equipamentos

Sistema web profissional para backup de arquivos de equipamentos de provedores, desenvolvido com React + TypeScript + Express + SQLite.

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Express.js + TypeScript + SQLite
- **Autenticação**: JWT
- **Upload**: Multer com validação
- **Estilização**: Tailwind CSS v4 + componentes customizados

## 📋 Funcionalidades

✅ **Implementado:**
- Login com identidade visual "Y BACK"
- Dashboard com auto-refresh (30s)
- Autenticação JWT
- Banco de dados SQLite real
- API completa para equipamentos e backups
- Upload de arquivos com validação
- Download de backups
- Componentes reutilizáveis
- Validações de segurança

🔄 **Em desenvolvimento:**
- Páginas de equipamentos com CRUD completo
- Página de backups com filtros

## 🛠️ Instalação e Execução

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔐 Credenciais Padrão

- **Usuário**: admin
- **Senha**: admin123

## 📊 Estrutura do Banco de Dados

### Tabela `users`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PRIMARY KEY | ID único |
| username | TEXT | Nome de usuário |
| password | TEXT | Senha hash |
| created_at | DATETIME | Data de criação |

### Tabela `equipamentos`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PRIMARY KEY | ID único |
| nome | TEXT | Nome do equipamento |
| ip | TEXT | IP do equipamento |
| tipo | TEXT | Tipo do equipamento |
| created_at | DATETIME | Data de criação |

### Tabela `backups`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER PRIMARY KEY | ID único |
| equipamento_id | INTEGER | FK para equipamentos |
| nome_arquivo | TEXT | Nome do arquivo |
| caminho | TEXT | Caminho do arquivo |
| data_upload | DATETIME | Data do upload |

## 🔧 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `GET /api/auth/validate` - Validar token

### Equipamentos
- `GET /api/equipamentos` - Listar todos
- `GET /api/equipamentos/:id` - Buscar por ID
- `POST /api/equipamentos` - Criar novo
- `PUT /api/equipamentos/:id` - Atualizar
- `DELETE /api/equipamentos/:id` - Deletar
- `GET /api/equipamentos/:id/backups` - Backups do equipamento

### Backups
- `GET /api/backups` - Listar todos
- `GET /api/backups/recent` - Backups recentes
- `GET /api/backups/:id` - Buscar por ID
- `POST /api/backups/equipamento/:id` - Upload de backup
- `GET /api/backups/:id/download` - Download
- `DELETE /api/backups/:id` - Deletar

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas
- `GET /api/dashboard/equipamentos` - Stats por equipamento

## 🛡️ Segurança

- Senhas com hash bcrypt
- Validação de arquivos (extensões: .zip, .tar.gz, .bak)
- Limite de tamanho: 100MB
- Sanitização de inputs
- Proteção contra XSS e SQL Injection
- Headers de segurança com Helmet

## 📱 Identidade Visual

- **Nome**: Y BACK
- **Cores**: Preto, branco, cinza escuro/claro
- **Fonte**: Inter
- **Estilo**: Moderna, minimalista, corporativa

## 🔗 URLs

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **API**: http://localhost:3001/api

## 📄 Licença

Este projeto foi desenvolvido seguindo as especificações do claude.md para uso interno.