import { Request, Response } from 'express';
import { BackupModel } from '../models/Backup';
import { EquipamentoModel } from '../models/Equipamento';
import path from 'path';
import fs from 'fs';

export class BackupController {
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const backups = await BackupModel.getWithEquipamento();
      res.json(backups);
    } catch (error) {
      console.error('Erro ao buscar backups:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const backup = await BackupModel.getById(parseInt(id));
      
      if (!backup) {
        res.status(404).json({ error: 'Backup não encontrado' });
        return;
      }

      res.json(backup);
    } catch (error) {
      console.error('Erro ao buscar backup:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async upload(req: Request, res: Response): Promise<void> {
    try {
      const { equipamentoId } = req.params;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'Arquivo de backup é obrigatório' });
        return;
      }

      const equipamento = await EquipamentoModel.getById(parseInt(equipamentoId));
      if (!equipamento) {
        fs.unlinkSync(file.path);
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }

      const backup = await BackupModel.create({
        equipamento_id: parseInt(equipamentoId),
        nome_arquivo: file.originalname,
        caminho: file.path
      });

      res.status(201).json(backup);
    } catch (error) {
      console.error('Erro ao fazer upload do backup:', error);
      
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async download(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const backup = await BackupModel.getById(parseInt(id));
      
      if (!backup) {
        res.status(404).json({ error: 'Backup não encontrado' });
        return;
      }

      const filePath = path.resolve(backup.caminho);
      
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Arquivo de backup não encontrado no servidor' });
        return;
      }

      res.download(filePath, backup.nome_arquivo, (err) => {
        if (err) {
          console.error('Erro no download:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
          }
        }
      });
    } catch (error) {
      console.error('Erro ao fazer download do backup:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const backup = await BackupModel.getById(parseInt(id));
      
      if (!backup) {
        res.status(404).json({ error: 'Backup não encontrado' });
        return;
      }

      const filePath = path.resolve(backup.caminho);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const deleted = await BackupModel.delete(parseInt(id));
      if (!deleted) {
        res.status(404).json({ error: 'Backup não encontrado' });
        return;
      }

      res.json({ message: 'Backup deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar backup:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getRecent(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const backups = await BackupModel.getRecentBackups(limit);
      res.json(backups);
    } catch (error) {
      console.error('Erro ao buscar backups recentes:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}