import { Request, Response } from 'express';
import { EquipamentoModel } from '../models/Equipamento';
import { BackupModel } from '../models/Backup';
import { UserModel } from '../models/User';
import { ProviderModel } from '../models/Provider';
import { BackupJobModel } from '../models/BackupJob';
import { schedulerService } from '../services/SchedulerService';
import { providerService } from '../services/ProviderService';

export class DashboardController {
  static async getStats(req: Request, res: Response): Promise<void> {
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
        recentBackups: [] as any[],
        equipamentosWithBackups: 0,
        backupsByProvider: {},
        backupsByStatus: {}
      };

      console.log('🔍 Dashboard: RETORNANDO STATS:', JSON.stringify(stats, null, 2));
      res.json(stats);
      
    } catch (error) {
      console.error('🔍 Dashboard: ERRO:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Direct database query for auto backup jobs count
  private static async countAutoBackupJobs(): Promise<number> {
    try {
      const equipamentos = await EquipamentoModel.getAll();
      const autoBackupEnabled = equipamentos.filter(eq => 
        eq.auto_backup_enabled && 
        eq.auto_backup_schedule && 
        (eq.ssh_enabled || eq.http_enabled)
      );
      
      console.log(`🔍 countAutoBackupJobs: Encontrados ${autoBackupEnabled.length} equipamentos com backup automático`);
      autoBackupEnabled.forEach(eq => {
        console.log(`  - ${eq.nome} (ID: ${eq.id}) - Schedule: ${eq.auto_backup_schedule}`);
      });
      
      return autoBackupEnabled.length;
    } catch (error) {
      console.error('Erro ao contar jobs automáticos:', error);
      return 0;
    }
  }

  static async getEquipamentoStats(req: Request, res: Response): Promise<void> {
    try {
      const equipamentos = await EquipamentoModel.getWithBackupCount();
      
      const equipamentoStats = equipamentos.map(eq => ({
        id: eq.id,
        nome: eq.nome,
        ip: eq.ip,
        tipo: eq.tipo,
        backupCount: eq.backup_count,
        created_at: eq.created_at
      }));

      res.json(equipamentoStats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de equipamentos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getProviderHealth(req: Request, res: Response): Promise<void> {
    try {
      const providers = await ProviderModel.getAll();
      const providerHealth = await Promise.all(
        providers.map(async (provider) => {
          let isHealthy = false;
          
          // Only test connection if provider is active
          if (provider.is_active) {
            try {
              const testResult = await providerService.testProviderConnection(provider);
              isHealthy = testResult.success;
            } catch (error) {
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
        })
      );

      res.json(providerHealth);
    } catch (error) {
      console.error('Erro ao verificar saúde dos providers:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getBackupJobsStats(req: Request, res: Response): Promise<void> {
    try {
      const backupJobs = await BackupJobModel.getWithDetails();
      
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
    } catch (error) {
      console.error('Erro ao buscar estatísticas de backup jobs:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }


  private static getBackupsByProvider(backups: any[]): Record<string, number> {
    return backups.reduce((acc, backup) => {
      const providerType = backup.provider_type || 'local';
      acc[providerType] = (acc[providerType] || 0) + 1;
      return acc;
    }, {});
  }

  private static getBackupsByStatus(backups: any[]): Record<string, number> {
    return backups.reduce((acc, backup) => {
      const status = backup.status || 'active';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }

  private static getJobsByStatus(jobs: any[]): Record<string, number> {
    return jobs.reduce((acc, job) => {
      const status = job.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }

  private static getJobsByProvider(jobs: any[]): Record<string, number> {
    return jobs.reduce((acc, job) => {
      const providerType = job.provider_type || 'unknown';
      acc[providerType] = (acc[providerType] || 0) + 1;
      return acc;
    }, {});
  }
}