import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { EquipamentoModel } from '../models/Equipamento';
import { BackupModel } from '../models/Backup';
import { schedulerService } from '../services/SchedulerService';

export const equipamentoValidation = [
  body('nome').notEmpty().withMessage('Nome é obrigatório'),
  body('ip').notEmpty().withMessage('IP é obrigatório').isIP().withMessage('IP inválido'),
  body('tipo').notEmpty().withMessage('Tipo é obrigatório')
];

export class EquipamentoController {
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const equipamentos = await EquipamentoModel.getWithBackupCount();
      res.json(equipamentos);
    } catch (error) {
      console.error('Erro ao buscar equipamentos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const equipamento = await EquipamentoModel.getById(parseInt(id));
      
      if (!equipamento) {
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }

      res.json(equipamento);
    } catch (error) {
      console.error('Erro ao buscar equipamento:', error);
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

      const { nome, ip, tipo } = req.body;
      const equipamento = await EquipamentoModel.create({ nome, ip, tipo });
      
      res.status(201).json(equipamento);
    } catch (error) {
      console.error('Erro ao criar equipamento:', error);
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
      const { nome, ip, tipo } = req.body;
      
      const equipamento = await EquipamentoModel.update(parseInt(id), { nome, ip, tipo });
      
      if (!equipamento) {
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }

      res.json(equipamento);
    } catch (error) {
      console.error('Erro ao atualizar equipamento:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Remover job de backup automatizado do scheduler antes de deletar
      await schedulerService.removeAutoBackupJob(parseInt(id));
      
      const deleted = await EquipamentoModel.delete(parseInt(id));
      
      if (!deleted) {
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }

      res.json({ message: 'Equipamento deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar equipamento:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getBackups(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const backups = await BackupModel.getByEquipamentoId(parseInt(id));
      
      res.json(backups);
    } catch (error) {
      console.error('Erro ao buscar backups do equipamento:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}