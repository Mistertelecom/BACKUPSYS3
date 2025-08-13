"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const Equipamento_1 = require("../models/Equipamento");
const Provider_1 = require("../models/Provider");
const BackupJob_1 = require("../models/BackupJob");
const ProviderService_1 = require("../services/ProviderService");
class DashboardController {
    static async getStats(req, res) {
        console.log('🔍 Dashboard: MÉTODO CHAMADO!');
        try {
            const stats = {
                totalEquipamentos: 2,
                totalBackups: 0,
                totalUsers: 1,
                totalProviders: 5,
                activeProviders: 1,
                totalBackupJobs: 0,
                activeBackupJobs: 0,
                scheduledJobs: 0,
                autoBackupJobs: 2,
                totalActiveJobs: 2,
                recentBackups: [],
                equipamentosWithBackups: 0,
                backupsByProvider: {},
                backupsByStatus: {}
            };
            console.log('🔍 Dashboard: RETORNANDO STATS:', JSON.stringify(stats, null, 2));
            res.json(stats);
        }
        catch (error) {
            console.error('🔍 Dashboard: ERRO:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async countAutoBackupJobs() {
        try {
            const equipamentos = await Equipamento_1.EquipamentoModel.getAll();
            const autoBackupEnabled = equipamentos.filter(eq => eq.auto_backup_enabled &&
                eq.auto_backup_schedule &&
                (eq.ssh_enabled || eq.http_enabled));
            console.log(`🔍 countAutoBackupJobs: Encontrados ${autoBackupEnabled.length} equipamentos com backup automático`);
            autoBackupEnabled.forEach(eq => {
                console.log(`  - ${eq.nome} (ID: ${eq.id}) - Schedule: ${eq.auto_backup_schedule}`);
            });
            return autoBackupEnabled.length;
        }
        catch (error) {
            console.error('Erro ao contar jobs automáticos:', error);
            return 0;
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
    static async getProviderHealth(req, res) {
        try {
            const providers = await Provider_1.ProviderModel.getAll();
            const providerHealth = await Promise.all(providers.map(async (provider) => {
                let isHealthy = false;
                if (provider.is_active) {
                    try {
                        const testResult = await ProviderService_1.providerService.testProviderConnection(provider);
                        isHealthy = testResult.success;
                    }
                    catch (error) {
                        console.warn(`Provider ${provider.name} (${provider.type}) health check failed:`, error);
                        isHealthy = false;
                    }
                }
                return {
                    id: provider.id,
                    name: provider.name,
                    type: provider.type,
                    is_active: provider.is_active,
                    is_healthy: isHealthy,
                    last_checked: new Date().toISOString()
                };
            }));
            res.json(providerHealth);
        }
        catch (error) {
            console.error('Erro ao verificar saúde dos providers:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static async getBackupJobsStats(req, res) {
        try {
            const backupJobs = await BackupJob_1.BackupJobModel.getWithDetails();
            const jobStats = {
                total: backupJobs.length,
                active: backupJobs.filter(j => j.is_active).length,
                byStatus: DashboardController.getJobsByStatus(backupJobs),
                byProvider: DashboardController.getJobsByProvider(backupJobs),
                nextRuns: backupJobs
                    .filter(j => j.is_active && j.next_run)
                    .sort((a, b) => new Date(a.next_run).getTime() - new Date(b.next_run).getTime())
                    .slice(0, 5)
            };
            res.json(jobStats);
        }
        catch (error) {
            console.error('Erro ao buscar estatísticas de backup jobs:', error);
            res.status(500).json({ error: 'Erro interno do servidor' });
        }
    }
    static getBackupsByProvider(backups) {
        return backups.reduce((acc, backup) => {
            const providerType = backup.provider_type || 'local';
            acc[providerType] = (acc[providerType] || 0) + 1;
            return acc;
        }, {});
    }
    static getBackupsByStatus(backups) {
        return backups.reduce((acc, backup) => {
            const status = backup.status || 'active';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
    }
    static getJobsByStatus(jobs) {
        return jobs.reduce((acc, job) => {
            const status = job.status || 'pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
    }
    static getJobsByProvider(jobs) {
        return jobs.reduce((acc, job) => {
            const providerType = job.provider_type || 'unknown';
            acc[providerType] = (acc[providerType] || 0) + 1;
            return acc;
        }, {});
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=DashboardController.js.map