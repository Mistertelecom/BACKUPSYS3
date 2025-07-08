Claro! Abaixo está o `.md` completo com **todas as seções** reorganizadas em ordem lógica e profissional, conforme seu objetivo. Tudo está pensado para uso em **IA CLI ou equipe**, com foco total em qualidade, clareza, identidade visual, segurança e escalabilidade.

---

```md
# 📦 Projeto: Y BACK – Sistema de Backup para Equipamentos de Provedor

## 🌐 Identidade Visual

- **Nome do sistema**: **Y BACK**
- **Paleta de cores**:
  - Preto (`#000000`)
  - Branco (`#FFFFFF`)
  - Cinza escuro (`#1F1F1F`)
  - Cinza claro (`#F5F5F5`)
  - Acento opcional: Azul gelo (`#60a5fa`) ou roxo suave (`#a78bfa`)
- **Fonte sugerida**: Inter, Poppins ou Space Grotesk
- **Estética**: Moderna, minimalista e corporativa

---

## ⚙️ Tecnologias Obrigatórias

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Banco de Dados**: SQLite (com conexão real, sem mocks ou arquivos estáticos)
- **Estilização**: Tailwind CSS v4 + OriginUI  
  [https://github.com/origin-space/originui](https://github.com/origin-space/originui)
- **ORM (opcional)**: Prisma ou Drizzle
- **Autenticação**: Simples com token ou sessão

---

## 📁 Estrutura de Pastas Sugerida

### Frontend
```

/frontend
├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── store/
│   └── App.tsx
└── tailwind.config.ts

```

### Backend
```

/backend
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── middlewares/
│   ├── models/
│   ├── database/
│   └── app.ts
└── uploads/

````

---

## 🔐 Tela de Login Estilizada

- Tela com fundo escuro e card central branco
- Logo grande: `Y BACK` com destaque visual
- Inputs com validação
- Botão de login com animação suave
- Erros visíveis mas discretos
- Responsivo para desktop e mobile
- Autenticação usando usuários reais do banco SQLite
- Após login, redirecionar para `/dashboard`

---

## 🧠 Objetivo do Sistema

Sistema web profissional para backup de arquivos de equipamentos de provedores.  
Cada equipamento pode ter múltiplos backups. O sistema deve permitir cadastro, listagem, upload e download, com dashboard atualizado e rotas protegidas.

---

## 🧩 Funcionalidades Principais

- Login com identidade visual “Y BACK”
- Dashboard com auto-refresh
- Cadastro e listagem de equipamentos
- Upload de arquivos de backup
- Visualização de backups por equipamento
- Download de backups
- Conexão real com SQLite
- Design com Tailwind CSS v4 + OriginUI

---

## 🔄 Fluxo Esperado

1. Usuário acessa `/login`
2. Após login, vai para `/dashboard`
3. Menu lateral:
   - Dashboard
   - Equipamentos
   - Backups
4. Em `/equipamentos`:
   - Cadastrar novo
   - Listar existentes
   - Visualizar backups
   - Fazer upload
   - Fazer download

---

## 🗃 Banco de Dados SQLite – Tabelas

### `users`
| campo      | tipo       |
|------------|------------|
| id         | integer PK |
| username   | string     |
| password   | string     |
| created_at | datetime   |

### `equipamentos`
| campo      | tipo       |
|------------|------------|
| id         | integer PK |
| nome       | string     |
| ip         | string     |
| tipo       | string     |
| created_at | datetime   |

### `backups`
| campo          | tipo       |
|----------------|------------|
| id             | integer PK |
| equipamento_id | FK         |
| nome_arquivo   | string     |
| caminho        | string     |
| data_upload    | datetime   |

---

## 👥 Permissões de Usuário (Opcional)

- **Administrador**: acesso total
- **Usuário comum**: apenas visualizar e baixar backups

---

## 🌐 Internacionalização (i18n)

- Suporte para múltiplos idiomas com arquivos JSON
- Idioma padrão: Português
- Estrutura: `/locales/pt.json`, `/locales/en.json`, etc.

---

## 🛡️ Segurança e Validações

- Limite de tamanho de upload (ex: 100MB)
- Extensões permitidas: `.zip`, `.tar.gz`, `.bak`
- Sanitização de inputs (evita SQL Injection e XSS)
- Hash de senhas com bcrypt
- Autenticação via token JWT ou sessão simples
- Proteção de rotas no backend

---

## 🧱 Componentes Reutilizáveis

- `<InputField />`
- `<Button />`
- `<Modal />`
- `<FileUploader />`
- `<CardBackup />`
- `<Sidebar />`
- `<Topbar />`
- `<ProtectedRoute />`

---

## 🔧 Scripts Recomendados

### Frontend
```bash
npm run dev        # inicia Vite
npm run build      # build de produção
````

### Backend

```bash
npm run dev        # inicia Express com nodemon
npm run start      # produção
```

---

## 🧪 Testes (Opcional)

* Backend: testes com `Jest` ou `Supertest`
* Frontend: testes com `Vitest` ou `React Testing Library`
* Testar login, upload, e fluxo de backups

---

## 🚀 Deploy

* **Frontend**: Vercel, Netlify ou VPS
* **Backend**: VPS com Node.js ou container Docker
* **Banco de dados**: SQLite local persistido
* **Pasta de backups**: `backend/uploads/`

### Execução Local:

```bash
# Terminal 1
cd backend
npm install
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```

---

## 📌 Roadmap de Implementação

### Etapa 1 – Setup Inicial

* [ ] Criar projetos React + Express + SQLite
* [ ] Instalar Tailwind CSS v4 + OriginUI

### Etapa 2 – Autenticação

* [ ] Backend: rota `/login`
* [ ] Frontend: página de login estilizada
* [ ] Middleware para proteger rotas privadas

### Etapa 3 – Backend

* [ ] Modelos: `users`, `equipamentos`, `backups`
* [ ] Rotas:

  * [ ] `POST /login`
  * [ ] `GET /equipamentos`
  * [ ] `POST /equipamentos`
  * [ ] `GET /equipamentos/:id`
  * [ ] `POST /equipamentos/:id/backup`
  * [ ] `GET /equipamentos/:id/backups`
  * [ ] `GET /backups/:id/download`

### Etapa 4 – Frontend

* [ ] Login com identidade visual
* [ ] Dashboard com dados reais e auto-refresh
* [ ] Tela de equipamentos e backups
* [ ] Upload com barra de progresso
* [ ] Download com botão visível

### Etapa 5 – Finalização

* [ ] Validações de formulário
* [ ] Toasts e mensagens de erro
* [ ] Responsividade
* [ ] Testes básicos

---

🎯 **Meta final**: Um sistema funcional e completo, com banco real, upload/download funcional, dashboard profissional, tela de login estilizada e visual corporativo “Y BACK”, pronto para produção ou expansão.

```

---

