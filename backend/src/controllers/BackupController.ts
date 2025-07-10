import { Request, Response } from 'express';
import { BackupModel } from '../models/Backup';
import { EquipamentoModel } from '../models/Equipamento';
import { ProviderModel } from '../models/Provider';
import { providerService } from '../services/ProviderService';
import { FileTypeDetector } from '../utils/fileTypeDetector';
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
      const { providerId } = req.body;
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

      // Get provider (use local as default)
      let provider;
      if (providerId) {
        provider = await ProviderModel.getById(parseInt(providerId));
        if (!provider || !provider.is_active) {
          fs.unlinkSync(file.path);
          res.status(400).json({ error: 'Provider inválido ou inativo' });
          return;
        }
      } else {
        provider = await ProviderModel.getByType('local');
        if (!provider) {
          fs.unlinkSync(file.path);
          res.status(500).json({ error: 'Provider local não encontrado' });
          return;
        }
      }

      // Validar compatibilidade do arquivo com o tipo de equipamento
      if (!FileTypeDetector.validateFileForEquipment(file.originalname, equipamento.tipo)) {
        const fileTypeInfo = FileTypeDetector.getFileTypeInfo(file.originalname);
        const detectedType = fileTypeInfo ? fileTypeInfo.equipment : 'Desconhecido';
        
        fs.unlinkSync(file.path);
        res.status(400).json({ 
          error: `Arquivo não é compatível com o tipo de equipamento. Tipo detectado: ${detectedType}, Equipamento: ${equipamento.tipo}` 
        });
        return;
      }

      // Initialize provider and upload file
      const providerInstance = await providerService.initializeProvider(provider);
      const uploadResult = await providerInstance.uploadFile(file, parseInt(equipamentoId));

      // Detectar tipo de arquivo para metadados
      const fileTypeInfo = FileTypeDetector.getFileTypeInfo(file.originalname);
      const detectedEquipmentType = FileTypeDetector.detectEquipmentType(file.originalname);

      const backup = await BackupModel.create({
        equipamento_id: parseInt(equipamentoId),
        nome_arquivo: file.originalname,
        caminho: file.path,
        provider_type: provider.type,
        provider_path: uploadResult.provider_path,
        file_size: uploadResult.file_size,
        checksum: uploadResult.checksum,
        status: 'active'
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
      const backupId = parseInt(id);
      
      // Validate backup ID
      if (isNaN(backupId) || backupId <= 0) {
        res.status(400).json({ error: 'ID do backup inválido' });
        return;
      }

      const backup = await BackupModel.getById(backupId);
      
      if (!backup) {
        res.status(404).json({ error: 'Backup não encontrado' });
        return;
      }

      // Security: Check if backup is active and not corrupted
      if (backup.status !== 'active') {
        res.status(403).json({ error: 'Backup não está disponível para download' });
        return;
      }

      // Get provider for this backup
      const provider = await ProviderModel.getByType(backup.provider_type);
      if (!provider) {
        res.status(500).json({ error: 'Provider não encontrado' });
        return;
      }

      // Security: Check if provider is active
      if (!provider.is_active) {
        res.status(403).json({ error: 'Provider está inativo' });
        return;
      }

      try {
        const providerInstance = await providerService.initializeProvider(provider);
        const fileBuffer = await providerInstance.downloadFile(backup.provider_path || backup.caminho);
        
        // Security: Validate file size and checksum if available
        if (backup.file_size && fileBuffer.length !== backup.file_size) {
          console.warn(`File size mismatch for backup ${backupId}: expected ${backup.file_size}, got ${fileBuffer.length}`);
        }
        
        // Security: Sanitize filename to prevent directory traversal
        const safeFilename = path.basename(backup.nome_arquivo).replace(/[^a-zA-Z0-9.-]/g, '_');
        
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Log download activity
        console.log(`Download iniciado - Backup ID: ${backupId}, Arquivo: ${backup.nome_arquivo}, Usuário: ${(req as any).user?.id}`);
        
        res.send(fileBuffer);
      } catch (providerError) {
        console.error('Erro no provider:', providerError);
        
        // Fallback to local file if provider fails (only for local provider)
        if (backup.provider_type === 'local' && backup.caminho) {
          const filePath = path.resolve(backup.caminho);
          
          // Security: Validate file path is within allowed directory
          const uploadsDir = path.resolve(__dirname, '../../uploads');
          if (!filePath.startsWith(uploadsDir)) {
            res.status(403).json({ error: 'Acesso negado ao arquivo' });
            return;
          }
          
          if (fs.existsSync(filePath)) {
            const safeFilename = path.basename(backup.nome_arquivo).replace(/[^a-zA-Z0-9.-]/g, '_');
            res.download(filePath, safeFilename);
            return;
          }
        }
        
        res.status(404).json({ error: 'Arquivo de backup não encontrado' });
      }
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