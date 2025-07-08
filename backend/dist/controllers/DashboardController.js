"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const Equipamento_1 = require("../models/Equipamento");
const Backup_1 = require("../models/Backup");
const User_1 = require("../models/User");
class DashboardController {
    static async getStats(req, res) {
        try {
            const [equipamentos, backups, users, recentBackups] = await Promise.all([
                Equipamento_1.EquipamentoModel.getAll(),
                Backup_1.BackupModel.getAll(),
                User_1.UserModel.getAllUsers(),
                Backup_1.BackupModel.getRecentBackups(5)
            ]);
            const stats = {
                totalEquipamentos: equipamentos.length,
                totalBackups: backups.length,
                totalUsers: users.length,
                recentBackups: recentBackups,
                equipamentosWithBackups: equipamentos.filter(eq => {
                    return backups.some(backup => backup.equipamento_id === eq.id);
                }).length
            };
            res.json(stats);
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas do dashboard:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async getEquipamentoStats(req, res) {
        try {
            const equipamentos = await Equipamento_1.EquipamentoModel.getWithBackupCount();
            const equipamentoStats = equipamentos.map(eq => ({
                id: eq.id,
                nome: eq.nome,
                ip: eq.ip,
                tipo: eq.tipo,
                backupCount: eq.backup_count,
                created_at: eq.created_at
            }));
            res.json(equipamentoStats);
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas de equipamentos:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=DashboardController.js.map