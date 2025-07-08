import { Request, Response } from 'express';
import { EquipamentoModel } from '../models/Equipamento';
import { BackupModel } from '../models/Backup';
import { UserModel } from '../models/User';

export class DashboardController {
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [equipamentos, backups, users, recentBackups] = await Promise.all([
        EquipamentoModel.getAll(),
        BackupModel.getAll(),
        UserModel.getAllUsers(),
        BackupModel.getRecentBackups(5)
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
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
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
}