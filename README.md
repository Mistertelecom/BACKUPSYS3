# YBACK - Sistema de Backup Automatizado para Equipamentos de Rede

Sistema completo para automação de backups de equipamentos de rede (Mikrotik, Ubiquiti, Mimosa) com interface web intuitiva e agendamento automatizado.

## 🚀 Funcionalidades

- **Backup Automatizado**: Suporte para equipamentos Mikrotik, Ubiquiti AirMAX e Mimosa
- **Interface Web**: Dashboard completo para gerenciamento de equipamentos e backups
- **Agendamento Intuitivo**: Sistema de agendamento por frequência (diário, semanal, mensal) sem necessidade de conhecer cron
- **Múltiplos Protocolos**: Suporte para SSH (Mikrotik/Ubiquiti) e HTTP (Mimosa)
- **Download Direto**: Download dos arquivos de backup através da interface web
- **Histórico Completo**: Visualização de todos os backups realizados
- **Containerizado**: Deploy fácil com Docker e Docker Compose

## 🛠️ Tecnologias

### Backend
- Node.js + TypeScript
- Express.js
- SQLite
- SSH2 para conexões SSH
- Axios para conexões HTTP
- Node-cron para agendamento

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Lucide React (ícones)

### Infraestrutura
- Docker & Docker Compose
- Nginx (proxy reverso)
- SSL/TLS ready

## 📦 Instalação

### Pré-requisitos
- Docker e Docker Compose instalados
- Portas 80 e 443 disponíveis (para nginx proxy)

### Deploy Rápido

1. Clone o repositório:
```bash
git clone <repository-url>
cd BACKUP3.0
```

2. Inicie os serviços:
```bash
# Desenvolvimento (sem nginx proxy)
docker-compose up -d

# Produção (com nginx proxy)
docker-compose --profile production up -d
```

3. Acesse a aplicação:
- **Desenvolvimento**: http://localhost:3000
- **Produção**: http://localhost (porta 80)

### Configuração Manual

Se preferir executar sem Docker:

#### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend (.env)
```env
NODE_ENV=development
PORT=3001
DATABASE_PATH=./database/database.sqlite
AUTO_BACKUP_DIR=./auto_backups
```

#### Configuração de Rede

O sistema detecta automaticamente o tipo de equipamento e protocolo:
- **Mikrotik**: SSH (porta 22 ou customizada)
- **Ubiquiti**: SSH (porta 22 ou customizada) 
- **Mimosa**: HTTP/HTTPS (porta 80/443 ou customizada)

## 🔐 Credenciais Padrão

- **Usuário**: admin
- **Senha**: admin123

## 📱 Como Usar

### 1. Adicionar Equipamento
- Acesse "Equipamentos" no menu lateral
- Clique em "Adicionar Equipamento"
- Preencha: Nome, IP, Tipo, Marca e Modelo

### 2. Configurar Backup Automático
- Na lista de equipamentos, clique em "Configurar Backup"
- Configure as credenciais de acesso
- Defina a frequência (Diário, Semanal, Mensal)
- Escolha o horário de execução
- Teste a conectividade
- Salve a configuração

### 3. Executar Backup Manual
- Na lista de equipamentos, clique em "Executar Backup"
- Acompanhe o progresso na dashboard

### 4. Baixar Backups
- Acesse a aba "Histórico de Backups"
- Clique em "Download" no backup desejado

## 🔌 Equipamentos Suportados

### Mikrotik RouterOS
- **Protocolo**: SSH
- **Arquivo**: .rsc (export compact)
- **Autenticação**: Usuário + Senha

### Ubiquiti AirMAX
- **Protocolo**: SSH  
- **Arquivo**: system.cfg
- **Autenticação**: Usuário + Senha

### Mimosa (C5C/C5X/B5C)
- **Protocolo**: HTTP/HTTPS
- **Arquivo**: mimosa.conf
- **Autenticação**: Apenas Senha

## 🐳 Docker

### Serviços Disponíveis

- **backend**: API Node.js (porta 3001)
- **frontend**: Interface React + Nginx (porta 3000)
- **nginx-proxy**: Proxy reverso com SSL (portas 80/443)

### Comandos Úteis

```bash
# Ver logs
docker-compose logs -f

# Rebuild após mudanças
docker-compose build --no-cache

# Parar serviços
docker-compose down

# Limpar volumes (CUIDADO: apaga dados)
docker-compose down -v
```

## 📁 Estrutura do Projeto

```
BACKUP3.0/
├── backend/                 # API Node.js
│   ├── src/
│   │   ├── controllers/    # Controladores da API
│   │   ├── services/       # Lógica de negócio
│   │   ├── models/         # Modelos do banco de dados
│   │   └── utils/          # Utilitários
│   └── Dockerfile
├── frontend/               # Interface React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/         # Páginas da aplicação
│   │   └── services/      # Serviços HTTP
│   ├── nginx.conf
│   └── Dockerfile
├── nginx/                  # Configuração Nginx
│   └── nginx.conf
└── docker-compose.yml
```

## 🔒 Segurança

- Headers de segurança configurados no Nginx
- Rate limiting para APIs
- Validação de entrada em todas as rotas
- Credenciais criptografadas no banco de dados
- Suporte para SSL/TLS

## 📈 Monitoramento

- Health checks configurados nos containers
- Logs estruturados
- Métricas de backup (sucessos/falhas)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Consulte a documentação dos equipamentos suportados
- Verifique os logs do Docker para debugging

---

**Desenvolvido para simplificar o gerenciamento de backups em redes de telecomunicações.**