"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database/database");
const auth_1 = __importDefault(require("./routes/auth"));
const info_1 = __importDefault(require("./routes/info"));
const users_1 = __importDefault(require("./routes/users"));
const equipamentos_1 = __importDefault(require("./routes/equipamentos"));
const backups_1 = __importDefault(require("./routes/backups"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const providers_1 = __importDefault(require("./routes/providers"));
const backupJobs_1 = __importDefault(require("./routes/backupJobs"));
const autoBackup_1 = __importDefault(require("./routes/autoBackup"));
const integration_1 = __importDefault(require("./routes/integration"));
const updates_1 = __importDefault(require("./routes/updates"));
const config_1 = __importDefault(require("./routes/config"));
const SchedulerService_1 = require("./services/SchedulerService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://backup.facilnettelecom.com.br', 'http://backup.facilnettelecom.com.br']
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use(express_1.default.static(path_1.default.join(__dirname, '../../frontend/dist')));
app.use('/api/auth', auth_1.default);
app.use('/api/info', info_1.default);
app.use('/api/users', users_1.default);
app.use('/api/equipamentos', equipamentos_1.default);
app.use('/api/backups', backups_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/providers', providers_1.default);
app.use('/api/backup-jobs', backupJobs_1.default);
app.use('/api/auto-backup', autoBackup_1.default);
app.use('/api/integration', integration_1.default);
app.use('/api/updates', updates_1.default);
app.use('/api/config', config_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Y BACK API is running',
        timestamp: new Date().toISOString()
    });
});
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Rota não encontrada' });
    }
    else {
        res.sendFile(path_1.default.join(__dirname, '../../frontend/dist/index.html'));
    }
});
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});
app.listen(PORT, async () => {
    console.log(`🚀 Servidor Y BACK rodando na porta ${PORT}`);
    console.log(`🌐 API disponível em: http://localhost:${PORT}/api`);
    console.log('Testando database...');
    console.log('Database instance:', database_1.database ? 'OK' : 'FAIL');
    try {
        await SchedulerService_1.schedulerService.initialize();
    }
    catch (error) {
        console.error('Erro ao inicializar scheduler:', error);
    }
});
exports.default = app;
//# sourceMappingURL=app.js.map