import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { BackupJobModel } from '../models/BackupJob';
import { EquipamentoModel } from '../models/Equipamento';
import { ProviderModel } from '../models/Provider';
import { schedulerService } from '../services/SchedulerService';
import cron from 'node-cron';

export const backupJobValidation = [
  body('equipamento_id').isInt().withMessage('ID do equipamento é obrigatório'),
  body('provider_id').isInt().withMessage('ID do provider é obrigatório'),
  body('schedule_pattern').custom((value) => {
    if (!cron.validate(value)) {
      throw new Error('Padrão de agendamento inválido');
    }
    return true;
  })
];

export class BackupJobController {
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const jobs = await BackupJobModel.getWithDetails();
      res.json(jobs);
    } catch (error) {
      console.error('Erro ao buscar backup jobs:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const job = await BackupJobModel.getById(parseInt(id));
      
      if (!job) {
        res.status(404).json({ error: 'Backup job não encontrado' });
        return;
      }

      res.json(job);
    } catch (error) {
      console.error('Erro ao buscar backup job:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getByEquipamentoId(req: Request, res: Response): Promise<void> {
    try {
      const { equipamentoId } = req.params;
      const jobs = await BackupJobModel.getByEquipamentoId(parseInt(equipamentoId));
      
      res.json(jobs);
    } catch (error) {
      console.error('Erro ao buscar backup jobs do equipamento:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { equipamento_id, provider_id, schedule_pattern, is_active } = req.body;

      // Validate equipamento exists
      const equipamento = await EquipamentoModel.getById(equipamento_id);
      if (!equipamento) {
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }

      // Validate provider exists and is active
      const provider = await ProviderModel.getById(provider_id);
      if (!provider || !provider.is_active) {
        res.status(400).json({ error: 'Provider não encontrado ou inativo' });
        return;
      }

      // Calculate next run time
      const nextRun = BackupJobController.calculateNextRun(schedule_pattern);

      const jobData = {
        equipamento_id,
        provider_id,
        schedule_pattern,
        is_active: is_active !== undefined ? is_active : true,
        next_run: nextRun,
        status: 'pending'
      };

      const job = await schedulerService.addJob(jobData);
      res.status(201).json(job);
    } catch (error) {
      console.error('Erro ao criar backup job:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { equipamento_id, provider_id, schedule_pattern, is_active } = req.body;

      const existingJob = await BackupJobModel.getById(parseInt(id));
      if (!existingJob) {
        res.status(404).json({ error: 'Backup job não encontrado' });
        return;
      }

      // Validate equipamento exists if being updated
      if (equipamento_id) {
        const equipamento = await EquipamentoModel.getById(equipamento_id);
        if (!equipamento) {
          res.status(404).json({ error: 'Equipamento não encontrado' });
          return;
        }
      }

      // Validate provider exists and is active if being updated
      if (provider_id) {
        const provider = await ProviderModel.getById(provider_id);
        if (!provider || !provider.is_active) {
          res.status(400).json({ error: 'Provider não encontrado ou inativo' });
          return;
        }
      }

      const updateData: any = {};
      if (equipamento_id !== undefined) updateData.equipamento_id = equipamento_id;
      if (provider_id !== undefined) updateData.provider_id = provider_id;
      if (schedule_pattern !== undefined) {
        updateData.schedule_pattern = schedule_pattern;
        updateData.next_run = BackupJobController.calculateNextRun(schedule_pattern);
      }
      if (is_active !== undefined) updateData.is_active = is_active;

      const job = await schedulerService.updateJob(parseInt(id), updateData);
      
      if (!job) {
        res.status(404).json({ error: 'Backup job não encontrado' });
        return;
      }

      res.json(job);
    } catch (error) {
      console.error('Erro ao atualizar backup job:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingJob = await BackupJobModel.getById(parseInt(id));
      if (!existingJob) {
        res.status(404).json({ error: 'Backup job não encontrado' });
        return;
      }

      await schedulerService.removeJob(parseInt(id));
      res.json({ message: 'Backup job deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar backup job:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async pause(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingJob = await BackupJobModel.getById(parseInt(id));
      if (!existingJob) {
        res.status(404).json({ error: 'Backup job não encontrado' });
        return;
      }

      await schedulerService.pauseJob(parseInt(id));
      res.json({ message: 'Backup job pausado com sucesso' });
    } catch (error) {
      console.error('Erro ao pausar backup job:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async resume(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingJob = await BackupJobModel.getById(parseInt(id));
      if (!existingJob) {
        res.status(404).json({ error: 'Backup job não encontrado' });
        return;
      }

      await schedulerService.resumeJob(parseInt(id));
      res.json({ message: 'Backup job retomado com sucesso' });
    } catch (error) {
      console.error('Erro ao retomar backup job:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async runNow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const job = await BackupJobModel.getById(parseInt(id));
      if (!job) {
        res.status(404).json({ error: 'Backup job não encontrado' });
        return;
      }

      // Execute job immediately (this would trigger the scheduler)
      // For now, just update the status to indicate manual execution
      await BackupJobModel.updateStatus(parseInt(id), 'running');
      
      res.json({ message: 'Backup job executado manualmente' });
    } catch (error) {
      console.error('Erro ao executar backup job:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getSchedulerStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = {
        scheduledJobs: schedulerService.getScheduledJobsCount(),
        scheduledJobIds: schedulerService.getScheduledJobs(),
        totalJobs: (await BackupJobModel.getAll()).length,
        activeJobs: (await BackupJobModel.getActive()).length
      };

      res.json(stats);
    } catch (error) {
      console.error('Erro ao buscar estatísticas do scheduler:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  private static calculateNextRun(cronPattern: string): string {
    try {
      // This is a simplified calculation
      // In production, you'd use a more sophisticated library
      const now = new Date();
      const nextRun = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour as example
      return nextRun.toISOString();
    } catch (error) {
      console.error('Erro ao calcular próxima execução:', error);
      return new Date().toISOString();
    }
  }

  static validateCronPattern(req: Request, res: Response): void {
    const { pattern } = req.body;
    
    if (!pattern) {
      res.status(400).json({ error: 'Padrão de agendamento é obrigatório' });
      return;
    }

    const isValid = cron.validate(pattern);
    
    if (isValid) {
      res.json({ 
        valid: true, 
        message: 'Padrão de agendamento válido',
        nextRun: BackupJobController.calculateNextRun(pattern)
      });
    } else {
      res.status(400).json({ 
        valid: false, 
        message: 'Padrão de agendamento inválido' 
      });
    }
  }
}