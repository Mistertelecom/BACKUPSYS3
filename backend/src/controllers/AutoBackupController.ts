import { Request, Response } from 'express';
import { EquipamentoModel } from '../models/Equipamento';
import { BackupModel } from '../models/Backup';
import { BackupScriptService } from '../services/BackupScriptService';
import { SSHService, SSHConfig } from '../services/SSHService';
import { HTTPService, HTTPConfig } from '../services/HTTPService';
import { schedulerService } from '../services/SchedulerService';
import fs from 'fs';
import path from 'path';

export class AutoBackupController {
  /**
   * Testa conectividade SSH ou HTTP de um equipamento
   */
  static async testConnectivity(req: Request, res: Response): Promise<void> {
    try {
      const { equipamentoId } = req.params;
      const equipamento = await EquipamentoModel.getById(parseInt(equipamentoId));
      
      if (!equipamento) {
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }

      // Determinar tipo de conexão baseado no tipo de equipamento
      const equipmentType = equipamento.tipo.toLowerCase();
      const isMimosa = equipmentType.includes('mimosa');

      let connectivity;

      if (isMimosa && equipamento.http_enabled) {
        // Teste HTTP para Mimosa
        const httpConfig: HTTPConfig = {
          host: equipamento.ip,
          port: equipamento.http_port || 80,
          protocol: equipamento.http_protocol || 'http',
          username: equipamento.http_username || '',
          password: equipamento.http_password || '',
          timeout: 10000,
          ignoreCertificateErrors: equipamento.http_ignore_ssl || false
        };

        const httpService = new HTTPService();
        connectivity = await httpService.checkConnectivity(httpConfig);
      } else if (equipamento.ssh_enabled) {
        // Teste SSH para outros equipamentos
        const sshConfig: SSHConfig = {
          host: equipamento.ip,
          port: equipamento.ssh_port || 22,
          username: equipamento.ssh_username || '',
          password: equipamento.ssh_password || undefined,
          privateKey: equipamento.ssh_private_key || undefined,
          timeout: 10000
        };

        const sshService = new SSHService();
        connectivity = await sshService.checkConnectivity(sshConfig);
      } else {
        res.status(400).json({ 
          error: isMimosa 
            ? 'HTTP não está habilitado para este equipamento Mimosa' 
            : 'SSH não está habilitado para este equipamento' 
        });
        return;
      }

      res.json({
        equipamento: {
          id: equipamento.id,
          nome: equipamento.nome,
          ip: equipamento.ip,
          tipo: equipamento.tipo
        },
        connectivity,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao testar conectividade:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Testa capacidade de backup automatizado
   */
  static async testBackupCapability(req: Request, res: Response): Promise<void> {
    try {
      const { equipamentoId } = req.params;
      const equipamento = await EquipamentoModel.getById(parseInt(equipamentoId));
      
      if (!equipamento) {
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }

      // Determinar tipo de conexão baseado no tipo de equipamento
      const equipmentType = equipamento.tipo.toLowerCase();
      const isMimosa = equipmentType.includes('mimosa');

      const backupService = new BackupScriptService();
      let capability;

      if (isMimosa && equipamento.http_enabled) {
        // Teste HTTP para Mimosa
        const httpConfig: HTTPConfig = {
          host: equipamento.ip,
          port: equipamento.http_port || 80,
          protocol: equipamento.http_protocol || 'http',
          username: equipamento.http_username || '',
          password: equipamento.http_password || '',
          timeout: 10000,
          ignoreCertificateErrors: equipamento.http_ignore_ssl || false
        };

        capability = await backupService.testBackupCapability(equipamento.tipo, undefined, httpConfig);
      } else if (equipamento.ssh_enabled) {
        // Teste SSH para outros equipamentos
        const sshConfig: SSHConfig = {
          host: equipamento.ip,
          port: equipamento.ssh_port || 22,
          username: equipamento.ssh_username || '',
          password: equipamento.ssh_password || undefined,
          privateKey: equipamento.ssh_private_key || undefined,
          timeout: 10000
        };

        capability = await backupService.testBackupCapability(equipamento.tipo, sshConfig);
      } else {
        res.status(400).json({ 
          error: isMimosa 
            ? 'HTTP não está habilitado para este equipamento Mimosa' 
            : 'SSH não está habilitado para este equipamento' 
        });
        return;
      }

      res.json({
        equipamento: {
          id: equipamento.id,
          nome: equipamento.nome,
          ip: equipamento.ip,
          tipo: equipamento.tipo
        },
        capability,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao testar capacidade de backup:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Executa backup manual via SSH ou HTTP
   */
  static async executeBackup(req: Request, res: Response): Promise<void> {
    try {
      const { equipamentoId } = req.params;
      const equipamento = await EquipamentoModel.getById(parseInt(equipamentoId));
      
      if (!equipamento) {
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }

      // Determinar tipo de conexão baseado no tipo de equipamento
      const equipmentType = equipamento.tipo.toLowerCase();
      const isMimosa = equipmentType.includes('mimosa');

      const backupService = new BackupScriptService();
      let result;

      if (isMimosa && equipamento.http_enabled) {
        // Backup HTTP para Mimosa
        const httpConfig: HTTPConfig = {
          host: equipamento.ip,
          port: equipamento.http_port || 80,
          protocol: equipamento.http_protocol || 'http',
          username: equipamento.http_username || '',
          password: equipamento.http_password || '',
          timeout: 30000,
          ignoreCertificateErrors: equipamento.http_ignore_ssl || false
        };

        const sshConfig: SSHConfig = {
          host: equipamento.ip,
          port: 22,
          username: '',
          password: '',
          timeout: 30000
        };

        result = await backupService.executeAutoBackup(
          equipamento.id!,
          equipamento.nome,
          equipamento.tipo,
          sshConfig,
          httpConfig
        );
      } else if (equipamento.ssh_enabled) {
        // Backup SSH para outros equipamentos
        const sshConfig: SSHConfig = {
          host: equipamento.ip,
          port: equipamento.ssh_port || 22,
          username: equipamento.ssh_username || '',
          password: equipamento.ssh_password || undefined,
          privateKey: equipamento.ssh_private_key || undefined,
          timeout: 30000
        };

        result = await backupService.executeAutoBackup(
          equipamento.id!,
          equipamento.nome,
          equipamento.tipo,
          sshConfig
        );
      } else {
        res.status(400).json({ 
          error: isMimosa 
            ? 'HTTP não está habilitado para este equipamento Mimosa' 
            : 'SSH não está habilitado para este equipamento' 
        });
        return;
      }

      if (result.success && result.localFilePath) {
        // Criar entrada no banco de dados para o backup
        try {
          const fileStats = fs.statSync(result.localFilePath);
          const backup = await BackupModel.create({
            equipamento_id: equipamento.id!,
            nome_arquivo: path.basename(result.localFilePath),
            caminho: result.localFilePath,
            provider_type: 'local',
            provider_path: result.localFilePath,
            file_size: fileStats.size,
            status: 'active'
          });

          res.json({
            success: true,
            backup,
            result,
            message: 'Backup executado com sucesso via SSH'
          });
        } catch (dbError) {
          console.error('Erro ao salvar backup no banco:', dbError);
          res.json({
            success: true,
            result,
            warning: 'Backup executado mas falhou ao salvar no banco de dados'
          });
        }
      } else {
        res.status(400).json({
          success: false,
          result,
          error: 'Falha na execução do backup'
        });
      }
    } catch (error) {
      console.error('Erro ao executar backup:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Atualiza configuração de backup automatizado
   */
  static async updateAutoBackupConfig(req: Request, res: Response): Promise<void> {
    try {
      const { equipamentoId } = req.params;
      const {
        ssh_enabled,
        ssh_port,
        ssh_username,
        ssh_password,
        ssh_private_key,
        auto_backup_enabled,
        auto_backup_schedule
      } = req.body;

      const equipamento = await EquipamentoModel.getById(parseInt(equipamentoId));
      
      if (!equipamento) {
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }

      // Validar dados
      if (ssh_enabled && (!ssh_username || (!ssh_password && !ssh_private_key))) {
        res.status(400).json({ 
          error: 'Para habilitar SSH, é necessário fornecer usuário e senha ou chave privada' 
        });
        return;
      }

      // Atualizar equipamento
      const updated = await EquipamentoModel.updateSSHConfig(parseInt(equipamentoId), {
        ssh_enabled: ssh_enabled || false,
        ssh_port: ssh_port || 22,
        ssh_username: ssh_username || null,
        ssh_password: ssh_password || null,
        ssh_private_key: ssh_private_key || null,
        auto_backup_enabled: auto_backup_enabled || false,
        auto_backup_schedule: auto_backup_schedule || '0 2 * * *'
      });

      if (!updated) {
        res.status(500).json({ error: 'Falha ao atualizar configuração' });
        return;
      }

      // Atualizar job de backup automatizado no scheduler
      const updatedEquipamento = await EquipamentoModel.getById(parseInt(equipamentoId));
      if (updatedEquipamento) {
        await schedulerService.updateAutoBackupJob(updatedEquipamento);
      }

      res.json({
        success: true,
        message: 'Configuração de backup automatizado atualizada',
        equipamento: updatedEquipamento
      });
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém configuração de backup automatizado
   */
  static async getAutoBackupConfig(req: Request, res: Response): Promise<void> {
    try {
      const { equipamentoId } = req.params;
      const equipamento = await EquipamentoModel.getById(parseInt(equipamentoId));
      
      if (!equipamento) {
        res.status(404).json({ error: 'Equipamento não encontrado' });
        return;
      }

      // Não retornar senha em texto plano
      const config = {
        id: equipamento.id,
        nome: equipamento.nome,
        ip: equipamento.ip,
        tipo: equipamento.tipo,
        ssh_enabled: equipamento.ssh_enabled,
        ssh_port: equipamento.ssh_port,
        ssh_username: equipamento.ssh_username,
        ssh_password: equipamento.ssh_password ? '***' : null,
        ssh_private_key: equipamento.ssh_private_key ? '***' : null,
        auto_backup_enabled: equipamento.auto_backup_enabled,
        auto_backup_schedule: equipamento.auto_backup_schedule
      };

      res.json(config);
    } catch (error) {
      console.error('Erro ao obter configuração:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Lista equipamentos com backup automatizado habilitado
   */
  static async getEnabledAutoBackups(req: Request, res: Response): Promise<void> {
    try {
      const equipamentos = await EquipamentoModel.getWithAutoBackupEnabled();
      res.json(equipamentos);
    } catch (error) {
      console.error('Erro ao listar equipamentos com backup automatizado:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém scripts disponíveis para backup
   */
  static async getAvailableScripts(req: Request, res: Response): Promise<void> {
    try {
      const backupService = new BackupScriptService();
      const scripts = backupService.getAvailableScripts();
      const supportedTypes = backupService.getSupportedEquipmentTypes();

      res.json({
        scripts,
        supportedTypes,
        count: scripts.length
      });
    } catch (error) {
      console.error('Erro ao obter scripts disponíveis:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém histórico de execuções de backup automatizado
   */
  static async getBackupHistory(req: Request, res: Response): Promise<void> {
    try {
      const { equipamentoId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const backups = await BackupModel.getAutomatedBackupHistory(parseInt(equipamentoId), limit);
      
      res.json({
        equipamentoId: parseInt(equipamentoId),
        backups,
        count: backups.length
      });
    } catch (error) {
      console.error('Erro ao obter histórico de backup:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}