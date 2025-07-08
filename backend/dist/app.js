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
const auth_1 = __importDefault(require("./routes/auth"));
const equipamentos_1 = __importDefault(require("./routes/equipamentos"));
const backups_1 = __importDefault(require("./routes/backups"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://yourdomain.com']
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use('/api/auth', auth_1.default);
app.use('/api/equipamentos', equipamentos_1.default);
app.use('/api/backups', backups_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Y BACK API is running',
        timestamp: new Date().toISOString()
    });
});
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});
app.listen(PORT, () => {
    console.log(`🚀 Servidor Y BACK rodando na porta ${PORT}`);
    console.log(`🌐 API disponível em: http://localhost:${PORT}/api`);
});
exports.default = app;
//# sourceMappingURL=app.js.map