import { Request, Response } from 'express';
import { githubService } from '../services/GitHubService';
import fs from 'fs';
import path from 'path';

export class UpdateController {
  /**
   * Obtém informações gerais de atualizações para a página principal
   */
  static async getUpdatesInfo(req: Request, res: Response): Promise<void> {
    try {
      // Ler version.json
      const versionPath = path.join(process.cwd(), 'version.json');
      let versionData: any = { version: '1.0.0', updatedAt: new Date().toISOString() };
      
      if (fs.existsSync(versionPath)) {
        const versionContent = fs.readFileSync(versionPath, 'utf-8');
        versionData = JSON.parse(versionContent);
      }

      // Estrutura de dados esperada pelo frontend
      const updatesData = {
        version: versionData.version || '1.0.0',
        build: versionData.buildInfo?.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0],
        releaseDate: versionData.updatedAt || new Date().toISOString(),
        changelog: [
          {
            version: versionData.version || '1.0.0',
            date: versionData.updatedAt || new Date().toISOString(),
            type: 'release',
            title: 'Sistema de Backup Automático v' + (versionData.version || '1.0.0'),
            description: 'Sistema completo de backup automático com interface web moderna e integração GitHub.',
            features: [
              'Interface web responsiva e intuitiva',
              'Sistema de autenticação seguro',
              'Backup automático e manual de equipamentos',
              'Dashboard com métricas em tempo real',
              'Integração completa com GitHub',
              'Sistema de atualizações automáticas'
            ],
            improvements: [
              'Performance otimizada',
              'Interface de usuário aprimorada',
              'Sistema de notificações',
              'Logs detalhados de operações'
            ],
            fixes: [
              'Correções de estabilidade',
              'Melhorias de segurança',
              'Otimização de banco de dados'
            ]
          }
        ],
        roadmap: [
          {
            version: '1.1.0',
            estimatedDate: '2025-01-15T00:00:00.000Z',
            title: 'Expansão de Funcionalidades',
            features: [
              'Sistema de relatórios avançados',
              'Integração com serviços de nuvem',
              'API REST expandida',
              'Sistema de alertas por email'
            ]
          },
          {
            version: '1.2.0',
            estimatedDate: '2025-03-01T00:00:00.000Z',
            title: 'Otimizações e Performance',
            features: [
              'Cache inteligente',
              'Compressão de backups',
              'Monitoramento avançado',
              'Suporte multi-idioma'
            ]
          }
        ],
        systemInfo: {
          name: 'BackupSys 3.0',
          description: 'Sistema Avançado de Backup Automático',
          author: 'Facilnet Telecom',
          license: 'Proprietário',
          website: 'https://backup.facilnettelecom.com.br',
          support: 'suporte@facilnettelecom.com.br'
        }
      };

      res.json(updatesData);
    } catch (error: any) {
      console.error('Erro ao obter informações de atualizações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter informações de atualizações',
        message: error.message
      });
    }
  }

  /**
   * Verifica se há atualizações disponíveis
   */
  static async checkUpdates(req: Request, res: Response): Promise<void> {
    try {
      const updateInfo = await githubService.checkForUpdates();
      
      res.json({
        success: true,
        updateInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Erro ao verificar atualizações:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao verificar atualizações',
        message: error.message
      });
    }
  }

  /**
   * Obtém informações detalhadas sobre uma release específica
   */
  static async getReleaseInfo(req: Request, res: Response): Promise<void> {
    try {
      const { version } = req.params;
      
      if (!version) {
        res.status(400).json({
          success: false,
          error: 'Versão é obrigatória'
        });
        return;
      }

      const releases = await githubService.getAllReleases(50);
      const release = releases.find(r => 
        r.tag_name === version || 
        r.tag_name === `v${version}` ||
        r.tag_name.replace(/^v/, '') === version
      );

      if (!release) {
        res.status(404).json({
          success: false,
          error: 'Release não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        release: {
          version: release.tag_name.replace(/^v/, ''),
          name: release.name,
          notes: release.body,
          publishedAt: release.published_at,
          isPrerelease: release.prerelease,
          assets: release.assets.map((asset: any) => ({
            name: asset.name,
            downloadCount: asset.download_count,
            downloadUrl: asset.browser_download_url
          }))
        }
      });
    } catch (error: any) {
      console.error('Erro ao obter informações da release:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter informações da release',
        message: error.message
      });
    }
  }

  /**
   * Obtém status atual do sistema
   */
  static async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const systemStatus = await githubService.getSystemStatus();
      
      res.json({
        success: true,
        status: systemStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Erro ao obter status do sistema:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter status do sistema',
        message: error.message
      });
    }
  }

  /**
   * Cria backup manual do sistema
   */
  static async createBackup(req: Request, res: Response): Promise<void> {
    try {
      const backupPath = await githubService.createSystemBackup();
      
      // Obter informações do backup
      const stats = fs.statSync(backupPath);
      const backupInfo = {
        path: backupPath,
        filename: path.basename(backupPath),
        size: stats.size,
        sizeFormatted: `${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`,
        createdAt: stats.birthtime.toISOString()
      };
      
      res.json({
        success: true,
        message: 'Backup criado com sucesso',
        backup: backupInfo
      });
    } catch (error: any) {
      console.error('Erro ao criar backup:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao criar backup',
        message: error.message
      });
    }
  }

  /**
   * Executa atualização do sistema de forma segura
   */
  static async performUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { confirmBackup = true } = req.body;
      
      // Validações de segurança antes da atualização
      const systemStatus = await githubService.getSystemStatus();
      
      if (systemStatus.hasLocalChanges) {
        res.status(400).json({
          success: false,
          error: 'Sistema possui modificações locais não commitadas',
          message: 'É necessário fazer commit ou descartar as alterações antes de atualizar'
        });
        return;
      }

      // Verificar espaço em disco (mínimo 100MB livres)
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync("df . | tail -1 | awk '{print $4}'");
        const freeSpaceKB = parseInt(stdout.trim());
        const freeSpaceMB = freeSpaceKB / 1024;
        
        if (freeSpaceMB < 100) {
          res.status(400).json({
            success: false,
            error: 'Espaço em disco insuficiente',
            message: `Apenas ${Math.round(freeSpaceMB)}MB livres. Mínimo necessário: 100MB`
          });
          return;
        }
      } catch (diskError) {
        console.warn('Não foi possível verificar espaço em disco:', diskError);
      }

      // Verificar se há atualizações disponíveis
      const updateInfo = await githubService.checkForUpdates();
      if (!updateInfo.hasUpdate) {
        res.json({
          success: true,
          message: 'Sistema já está atualizado',
          currentVersion: updateInfo.currentVersion
        });
        return;
      }

      // Executar atualização segura
      console.log(`🚀 Iniciando atualização para v${updateInfo.latestVersion}...`);
      const result = await githubService.performSafeUpdate();

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          newVersion: updateInfo.latestVersion,
          backupPath: result.backupPath,
          changelog: updateInfo.changelog
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
          backupPath: result.backupPath
        });
      }
    } catch (error: any) {
      console.error('Erro durante atualização:', error);
      res.status(500).json({
        success: false,
        error: 'Erro durante atualização',
        message: error.message
      });
    }
  }

  /**
   * Lista releases disponíveis
   */
  static async listReleases(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const includePrerelease = req.query.prerelease === 'true';
      
      const allReleases = await githubService.getAllReleases(limit * 2); // Buscar mais para filtrar
      
      let releases = allReleases;
      if (!includePrerelease) {
        releases = releases.filter(release => !release.prerelease);
      }
      
      releases = releases.slice(0, limit);
      
      const currentVersion = await githubService.getCurrentVersion();
      
      const formattedReleases = releases.map(release => ({
        version: release.tag_name.replace(/^v/, ''),
        name: release.name,
        publishedAt: release.published_at,
        isPrerelease: release.prerelease,
        isCurrent: release.tag_name.replace(/^v/, '') === currentVersion,
        hasAssets: release.assets.length > 0,
        downloadCount: release.assets.reduce((sum: number, asset: any) => sum + asset.download_count, 0)
      }));

      res.json({
        success: true,
        releases: formattedReleases,
        currentVersion,
        total: releases.length
      });
    } catch (error: any) {
      console.error('Erro ao listar releases:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar releases',
        message: error.message
      });
    }
  }

  /**
   * Valida segurança de uma atualização específica
   */
  static async validateUpdate(req: Request, res: Response): Promise<void> {
    try {
      const { version, downloadUrl, checksum } = req.body;
      
      if (!version || !downloadUrl) {
        res.status(400).json({
          success: false,
          error: 'Versão e URL são obrigatórios'
        });
        return;
      }

      const validation = await githubService.validateUpdateSecurity(downloadUrl, checksum);
      
      res.json({
        success: true,
        validation: {
          isValid: validation.isValid,
          checksum: validation.checksum,
          errors: validation.errors,
          version,
          downloadUrl: validation.isValid ? downloadUrl : null
        }
      });
    } catch (error: any) {
      console.error('Erro ao validar atualização:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao validar atualização',
        message: error.message
      });
    }
  }

  /**
   * Lista backups disponíveis
   */
  static async listBackups(req: Request, res: Response): Promise<void> {
    try {
      const backupDir = path.join(process.cwd(), 'system_backups');
      
      if (!fs.existsSync(backupDir)) {
        res.json({
          success: true,
          backups: [],
          message: 'Nenhum backup encontrado'
        });
        return;
      }

      const backupFiles = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('system-backup-') && file.endsWith('.tar.gz'))
        .map(file => {
          const filePath = path.join(backupDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            filename: file,
            path: filePath,
            size: stats.size,
            sizeFormatted: `${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB`,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        success: true,
        backups: backupFiles,
        total: backupFiles.length,
        totalSize: backupFiles.reduce((sum, backup) => sum + backup.size, 0)
      });
    } catch (error: any) {
      console.error('Erro ao listar backups:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar backups',
        message: error.message
      });
    }
  }
}