import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  changelog: string;
  downloadUrl?: string;
  assets?: Array<{
    name: string;
    downloadUrl: string;
    size: number;
  }>;
}

export interface SystemStatus {
  currentBranch: string;
  hasLocalChanges: boolean;
  lastCommit: {
    hash: string;
    date: string;
    message: string;
  };
  diskSpace: {
    free: number;
    used: number;
    total: number;
  };
}

export interface SafeUpdateResult {
  success: boolean;
  message: string;
  backupPath?: string;
}

class GitHubService {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
      userAgent: 'BackupSys3/1.0.0'
    });

    this.owner = process.env.GITHUB_OWNER || 'Mistertelecom';
    this.repo = process.env.GITHUB_REPO || 'BACKUPSYS3';
  }

  /**
   * Verifica se há atualizações disponíveis
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    try {
      // Obter versão atual
      const currentVersion = await this.getCurrentVersion();
      
      // Buscar latest release no GitHub
      const { data: latestRelease } = await this.octokit.rest.repos.getLatestRelease({
        owner: this.owner,
        repo: this.repo
      });

      const latestVersion = latestRelease.tag_name.replace(/^v/, '');
      const hasUpdate = this.compareVersions(currentVersion, latestVersion) < 0;

      const assets = latestRelease.assets.map(asset => ({
        name: asset.name,
        downloadUrl: asset.browser_download_url,
        size: asset.size
      }));

      return {
        hasUpdate,
        currentVersion,
        latestVersion,
        changelog: latestRelease.body || 'Sem changelog disponível',
        downloadUrl: latestRelease.zipball_url,
        assets
      };
    } catch (error: any) {
      console.error('Erro ao verificar atualizações:', error);
      throw new Error(`Erro ao verificar atualizações: ${error.message}`);
    }
  }

  /**
   * Obtém a versão atual do sistema
   */
  async getCurrentVersion(): Promise<string> {
    try {
      const versionPath = path.join(process.cwd(), 'version.json');
      
      if (fs.existsSync(versionPath)) {
        const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
        return versionData.version || '1.0.0';
      }

      // Tentar obter versão do Git
      try {
        const { stdout } = await execAsync('git describe --tags --abbrev=0');
        return stdout.trim().replace(/^v/, '');
      } catch {
        return '1.0.0';
      }
    } catch (error) {
      console.error('Erro ao obter versão atual:', error);
      return '1.0.0';
    }
  }

  /**
   * Obtém todas as releases
   */
  async getAllReleases(limit: number = 10): Promise<any[]> {
    try {
      const { data: releases } = await this.octokit.rest.repos.listReleases({
        owner: this.owner,
        repo: this.repo,
        per_page: limit
      });

      return releases;
    } catch (error: any) {
      console.error('Erro ao obter releases:', error);
      throw new Error(`Erro ao obter releases: ${error.message}`);
    }
  }

  /**
   * Obtém status atual do sistema
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      // Informações do Git
      const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD');
      const { stdout: status } = await execAsync('git status --porcelain');
      const { stdout: lastCommit } = await execAsync('git log -1 --pretty=format:"%H|%ci|%s"');

      const [hash, date, message] = lastCommit.trim().split('|');

      // Informações do disco
      let diskSpace = { free: 0, used: 0, total: 0 };
      try {
        const { stdout: diskInfo } = await execAsync("df . | tail -1 | awk '{print $2\" \"$3\" \"$4}'");
        const [total, used, free] = diskInfo.trim().split(' ').map(Number);
        diskSpace = { free: free * 1024, used: used * 1024, total: total * 1024 };
      } catch (diskError) {
        console.warn('Não foi possível obter informações do disco:', diskError);
      }

      return {
        currentBranch: branch.trim(),
        hasLocalChanges: status.trim().length > 0,
        lastCommit: {
          hash: hash.trim(),
          date: date.trim(),
          message: message.trim()
        },
        diskSpace
      };
    } catch (error: any) {
      console.error('Erro ao obter status do sistema:', error);
      throw new Error(`Erro ao obter status do sistema: ${error.message}`);
    }
  }

  /**
   * Cria backup do sistema antes da atualização
   */
  async createSystemBackup(): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const backupDir = path.join(process.cwd(), 'system_backups');
      const backupPath = path.join(backupDir, `system-backup-${timestamp}.tar.gz`);

      // Criar diretório de backup se não existir
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Criar backup (excluindo node_modules e arquivos temporários)
      await execAsync(`tar -czf "${backupPath}" \
        --exclude='node_modules' \
        --exclude='system_backups' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='*.log' \
        --exclude='uploads' \
        --exclude='database/*.sqlite*' \
        .`);

      console.log(`✅ Backup criado: ${backupPath}`);
      return backupPath;
    } catch (error: any) {
      console.error('Erro ao criar backup:', error);
      throw new Error(`Erro ao criar backup: ${error.message}`);
    }
  }

  /**
   * Executa atualização segura do sistema
   */
  async performSafeUpdate(): Promise<SafeUpdateResult> {
    let backupPath: string | undefined;

    try {
      // 1. Criar backup
      console.log('📦 Criando backup do sistema...');
      backupPath = await this.createSystemBackup();

      // 2. Fazer stash das alterações locais (se houver)
      try {
        await execAsync('git stash push -m "Backup antes da atualização"');
      } catch (stashError) {
        console.log('Nenhuma alteração local para fazer stash');
      }

      // 3. Fazer fetch das atualizações
      console.log('🔄 Baixando atualizações...');
      await execAsync('git fetch origin');

      // 4. Fazer merge/pull das atualizações
      await execAsync('git pull origin main');

      // 5. Instalar dependências
      console.log('📥 Instalando dependências...');
      await execAsync('npm run install:all');

      // 6. Fazer build
      console.log('🏗️ Compilando sistema...');
      await execAsync('npm run build');

      // 7. Atualizar version.json
      await this.updateVersionFile();

      console.log('✅ Atualização concluída com sucesso!');
      return {
        success: true,
        message: 'Sistema atualizado com sucesso',
        backupPath
      };

    } catch (error: any) {
      console.error('❌ Erro durante atualização:', error);

      // Tentar fazer rollback
      try {
        console.log('🔄 Fazendo rollback...');
        await execAsync('git reset --hard HEAD~1');
        await execAsync('git stash pop || true');
      } catch (rollbackError) {
        console.error('Erro no rollback:', rollbackError);
      }

      return {
        success: false,
        message: `Erro durante atualização: ${error.message}`,
        backupPath
      };
    }
  }

  /**
   * Valida segurança de uma atualização
   */
  async validateUpdateSecurity(downloadUrl: string, expectedChecksum?: string): Promise<{
    isValid: boolean;
    checksum: string;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      // Verificar se a URL é do GitHub
      if (!downloadUrl.includes('github.com')) {
        errors.push('URL não é do GitHub oficial');
      }

      // Verificar se a URL é HTTPS
      if (!downloadUrl.startsWith('https://')) {
        errors.push('URL não utiliza HTTPS');
      }

      // TODO: Implementar verificação de checksum quando disponível
      const checksum = 'placeholder-checksum';
      
      if (expectedChecksum && checksum !== expectedChecksum) {
        errors.push('Checksum não confere');
      }

      return {
        isValid: errors.length === 0,
        checksum,
        errors
      };
    } catch (error: any) {
      return {
        isValid: false,
        checksum: '',
        errors: [`Erro na validação: ${error.message}`]
      };
    }
  }

  /**
   * Atualiza arquivo version.json
   */
  private async updateVersionFile(): Promise<void> {
    try {
      const versionPath = path.join(process.cwd(), 'version.json');
      const currentVersion = await this.getCurrentVersion();
      
      const versionData = {
        version: currentVersion,
        updatedAt: new Date().toISOString(),
        buildInfo: {
          timestamp: new Date().toISOString(),
          nodeVersion: process.version,
          platform: process.platform
        }
      };

      fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));
      console.log('✅ Arquivo version.json atualizado');
    } catch (error) {
      console.warn('Erro ao atualizar version.json:', error);
    }
  }

  /**
   * Compara duas versões semânticas
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }
}

export const githubService = new GitHubService();