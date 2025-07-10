import path from 'path';
import fs from 'fs';
import { SSHService, SSHConfig, SSHResult } from './SSHService';
import { HTTPService, HTTPConfig, HTTPResult } from './HTTPService';

export interface BackupScript {
  equipmentType: string;
  commands: string[];
  filePattern: string;
  description: string;
  connectionType: 'ssh' | 'http';
}

export interface BackupExecutionResult {
  success: boolean;
  backupFile?: string;
  localFilePath?: string;
  logs: SSHResult[];
  error?: string;
  timestamp: string;
}

export class BackupScriptService {
  private sshService: SSHService;
  private httpService: HTTPService;
  private backupDir: string;

  constructor() {
    this.sshService = new SSHService();
    this.httpService = new HTTPService();
    this.backupDir = path.resolve(process.env.AUTO_BACKUP_DIR || './auto_backups');
    
    // Criar diretório de backups automáticos se não existir
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Scripts de backup por tipo de equipamento
   */
  private getBackupScripts(): Record<string, BackupScript> {
    return {
      'mikrotik': {
        equipmentType: 'Mikrotik RouterOS',
        commands: [
          // Criar backup binário
          '/system backup save name=yback-auto-backup',
          // Aguardar criação do backup
          ':delay 3',
          // Criar export de configuração
          '/export file=yback-auto-export',
          // Aguardar criação do export
          ':delay 2',
          // Listar arquivos para confirmar criação
          '/file print where name~"yback-auto"'
        ],
        filePattern: 'yback-auto-*',
        description: 'Backup automático Mikrotik (binário + export)',
        connectionType: 'ssh'
      },
      'ubiquiti': {
        equipmentType: 'Ubiquiti',
        commands: [
          // Backup do arquivo principal system.cfg do AirMAX
          'cp /tmp/system.cfg /tmp/yback-auto-system.cfg 2>/dev/null || echo "# ERRO: system.cfg não encontrado" > /tmp/yback-auto-system.cfg',
          // Verificar se o arquivo existe e tem conteúdo
          'ls -la /tmp/system.cfg && echo "system.cfg encontrado!" || echo "system.cfg não existe"',
          // Confirmar criação do backup
          'ls -la /tmp/yback-auto-system.cfg && echo "Backup system.cfg criado com sucesso"'
        ],
        filePattern: 'yback-auto-system.cfg',
        description: 'Backup automático Ubiquiti AirMAX - system.cfg',
        connectionType: 'ssh'
      },
      'huawei': {
        equipmentType: 'Huawei',
        commands: [
          // Salvar configuração atual
          'save',
          // Fazer backup para arquivo
          'backup startup-configuration to yback-auto-backup.cfg',
          // Confirmar
          'dir | include yback-auto'
        ],
        filePattern: 'yback-auto-backup.cfg',
        description: 'Backup automático Huawei (configuração startup)',
        connectionType: 'ssh'
      },
      'mimosa': {
        equipmentType: 'Mimosa',
        commands: [
          // Para Mimosa, os "comandos" são na verdade rotas HTTP
          'login',           // Fazer login na interface web
          'backup',          // Fazer download do arquivo de configuração
          'logout'           // Fazer logout
        ],
        filePattern: 'mimosa.conf',
        description: 'Backup automático Mimosa (configuração via HTTP)',
        connectionType: 'http'
      }
    };
  }

  /**
   * Obtém script de backup para um tipo de equipamento
   */
  getScriptForEquipment(equipmentType: string): BackupScript | null {
    const scripts = this.getBackupScripts();
    const normalizedType = equipmentType.toLowerCase();
    
    // Busca exata
    if (scripts[normalizedType]) {
      return scripts[normalizedType];
    }
    
    // Busca por palavras-chave
    for (const [key, script] of Object.entries(scripts)) {
      if (normalizedType.includes(key) || key.includes(normalizedType)) {
        return script;
      }
    }
    
    return null;
  }

  /**
   * Executa backup automatizado
   */
  async executeAutoBackup(
    equipmentId: number,
    equipmentName: string,
    equipmentType: string,
    sshConfig: SSHConfig,
    httpConfig?: HTTPConfig
  ): Promise<BackupExecutionResult> {
    const timestamp = new Date().toISOString();
    const result: BackupExecutionResult = {
      success: false,
      logs: [],
      timestamp
    };

    try {
      // Obter script para o tipo de equipamento
      const script = this.getScriptForEquipment(equipmentType);
      if (!script) {
        result.error = `Tipo de equipamento não suportado para backup automático: ${equipmentType}`;
        return result;
      }

      console.log(`Iniciando backup automático para ${equipmentName} (${equipmentType})`);

      if (script.connectionType === 'http') {
        // BACKUP VIA HTTP (Mimosa)
        if (!httpConfig) {
          result.error = 'Configuração HTTP necessária para equipamentos Mimosa';
          return result;
        }

        await this.httpService.connect(httpConfig);
        console.log(`Conectado via HTTP em ${httpConfig.protocol || 'http'}://${httpConfig.host}:${httpConfig.port || 80}`);

        // Fazer login
        const loginResult = await this.httpService.login();
        if (!loginResult.success) {
          result.error = `Falha no login HTTP: ${loginResult.error}`;
          return result;
        }

        result.logs.push(loginResult);

        // Fazer download direto do arquivo de configuração
        const downloadResult = await this.executeHttpBackup(
          equipmentId,
          equipmentName,
          equipmentType,
          script.filePattern,
          timestamp,
          httpConfig.host
        );

        if (downloadResult.success) {
          result.success = true;
          result.backupFile = downloadResult.backupFile;
          result.localFilePath = downloadResult.localFilePath;
        } else {
          result.error = downloadResult.error;
        }
        
      } else {
        // BACKUP VIA SSH (Mikrotik, Ubiquiti, Huawei)
        await this.sshService.connect(sshConfig);
        console.log(`Conectado via SSH em ${sshConfig.host}:${sshConfig.port}`);

        // Executar comandos de backup
        const commandResults = await this.sshService.executeCommands(script.commands);
        result.logs = commandResults;

        // Verificar se todos os comandos foram executados com sucesso
        const allSuccessful = commandResults.every(cmd => cmd.success);
        if (!allSuccessful) {
          const failedCommands = commandResults.filter(cmd => !cmd.success);
          result.error = `Falha em ${failedCommands.length} comando(s): ${failedCommands.map(cmd => cmd.error).join(', ')}`;
          return result;
        }

        // Aguardar um pouco para garantir que os arquivos foram criados
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fazer download dos arquivos de backup
        const downloadResult = await this.downloadBackupFiles(
          equipmentId,
          equipmentName,
          equipmentType,
          script.filePattern,
          timestamp,
          sshConfig.host
        );

        if (downloadResult.success) {
          result.success = true;
          result.backupFile = downloadResult.backupFile;
          result.localFilePath = downloadResult.localFilePath;
        } else {
          result.error = downloadResult.error;
        }
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro no backup automático:', error);
    } finally {
      // Sempre desconectar
      await this.sshService.disconnect();
      await this.httpService.disconnect();
    }

    return result;
  }

  /**
   * Faz download dos arquivos de backup
   */
  private async downloadBackupFiles(
    equipmentId: number,
    equipmentName: string,
    equipmentType: string,
    filePattern: string,
    timestamp: string,
    equipmentIP?: string
  ): Promise<{ success: boolean; backupFile?: string; localFilePath?: string; error?: string }> {
    try {
      const sanitizedName = equipmentName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const sanitizedIP = equipmentIP ? equipmentIP.replace(/[^0-9.]/g, '') : 'no-ip';
      
      if (equipmentType.toLowerCase().includes('mikrotik')) {
        // Para Mikrotik, baixar tanto o backup quanto o export
        const backupFile = 'yback-auto-backup.backup';
        const exportFile = 'yback-auto-export.rsc';
        
        const localBackupPath = path.join(this.backupDir, `${sanitizedName}-${sanitizedIP}.backup`);
        const localExportPath = path.join(this.backupDir, `${sanitizedName}-${sanitizedIP}.rsc`);
        
        // Tentar baixar o backup binário
        const backupResult = await this.sshService.downloadFile(backupFile, localBackupPath);
        
        // Tentar baixar o export (mais importante)
        const exportResult = await this.sshService.downloadFile(exportFile, localExportPath);
        
        if (exportResult.success) {
          // Limpar arquivos remotos
          await this.sshService.executeCommand(`/file remove [find name~"yback-auto"]`);
          
          return {
            success: true,
            backupFile: exportFile,
            localFilePath: localExportPath
          };
        } else if (backupResult.success) {
          return {
            success: true,
            backupFile: backupFile,
            localFilePath: localBackupPath
          };
        } else {
          return {
            success: false,
            error: 'Falha ao baixar arquivos de backup do Mikrotik'
          };
        }
      } else if (equipmentType.toLowerCase().includes('ubiquiti')) {
        // Para Ubiquiti AirMAX - system.cfg via cat (sem SFTP)
        const localPath = path.join(this.backupDir, `${sanitizedName}-${sanitizedIP}.cfg`);
        
        console.log(`Obtendo system.cfg via SSH: -> ${localPath}`);
        
        // Obter conteúdo via cat ao invés de SCP/SFTP
        const catResult = await this.sshService.executeCommand('cat /tmp/yback-auto-system.cfg');
        
        if (catResult.success && catResult.data) {
          // Salvar conteúdo no arquivo local
          try {
            fs.writeFileSync(localPath, catResult.data);
            
            // Limpar arquivo remoto
            await this.sshService.executeCommand('rm -f /tmp/yback-auto-system.cfg 2>/dev/null || true');
            
            return {
              success: true,
              backupFile: 'yback-auto-system.cfg',
              localFilePath: localPath
            };
          } catch (error) {
            return {
              success: false,
              error: `Falha ao salvar system.cfg: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
            };
          }
        } else {
          return {
            success: false,
            error: `Falha ao ler system.cfg: ${catResult.error || 'Arquivo vazio'}`
          };
        }
      } else {
        // Para outros equipamentos (Huawei, etc.)
        const remoteFile = filePattern;
        const extension = path.extname(filePattern) || '.cfg';
        const localPath = path.join(this.backupDir, `${sanitizedName}-${sanitizedIP}${extension}`);
        
        const downloadResult = await this.sshService.downloadFile(remoteFile, localPath);
        
        if (downloadResult.success) {
          return {
            success: true,
            backupFile: remoteFile,
            localFilePath: localPath
          };
        } else {
          return {
            success: false,
            error: `Falha ao baixar backup: ${downloadResult.error}`
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Executa backup via HTTP (Mimosa)
   */
  private async executeHttpBackup(
    equipmentId: number,
    equipmentName: string,
    equipmentType: string,
    filePattern: string,
    timestamp: string,
    equipmentIP?: string
  ): Promise<{ success: boolean; backupFile?: string; localFilePath?: string; error?: string }> {
    try {
      const sanitizedName = equipmentName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const sanitizedIP = equipmentIP ? equipmentIP.replace(/[^0-9.]/g, '') : 'no-ip';
      
      // Para Mimosa - download direto do arquivo de configuração
      const localPath = path.join(this.backupDir, `${sanitizedName}-${sanitizedIP}.conf`);
      
      console.log(`Fazendo download do backup Mimosa: ${filePattern} -> ${localPath}`);
      
      // Tentar download do arquivo de configuração
      const downloadResult = await this.httpService.downloadConfigFile(filePattern, localPath);
      
      if (downloadResult.success) {
        return {
          success: true,
          backupFile: filePattern,
          localFilePath: localPath
        };
      } else {
        return {
          success: false,
          error: `Falha ao baixar configuração Mimosa: ${downloadResult.error}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Lista tipos de equipamento suportados
   */
  getSupportedEquipmentTypes(): string[] {
    return Object.keys(this.getBackupScripts());
  }

  /**
   * Obtém informações sobre scripts disponíveis
   */
  getAvailableScripts(): BackupScript[] {
    return Object.values(this.getBackupScripts());
  }

  /**
   * Testa conectividade e capacidade de backup
   */
  async testBackupCapability(
    equipmentType: string,
    sshConfig?: SSHConfig,
    httpConfig?: HTTPConfig
  ): Promise<{ canBackup: boolean; script?: BackupScript; connectivity?: any; error?: string }> {
    try {
      // Verificar se há script para este tipo
      const script = this.getScriptForEquipment(equipmentType);
      if (!script) {
        return {
          canBackup: false,
          error: `Tipo de equipamento não suportado: ${equipmentType}`
        };
      }

      if (script.connectionType === 'http') {
        // Testar conectividade HTTP (Mimosa)
        if (!httpConfig) {
          return {
            canBackup: false,
            error: 'Configuração HTTP necessária para equipamentos Mimosa'
          };
        }

        const connectivity = await this.httpService.checkConnectivity(httpConfig);
        
        return {
          canBackup: connectivity.httpConnectable,
          script,
          connectivity,
          error: connectivity.httpConnectable ? undefined : 'HTTP não acessível'
        };
      } else {
        // Testar conectividade SSH (Mikrotik, Ubiquiti, Huawei)
        if (!sshConfig) {
          return {
            canBackup: false,
            error: 'Configuração SSH necessária para este tipo de equipamento'
          };
        }

        const connectivity = await this.sshService.checkConnectivity(sshConfig);
        
        return {
          canBackup: connectivity.sshConnectable,
          script,
          connectivity,
          error: connectivity.sshConnectable ? undefined : 'SSH não acessível'
        };
      }
    } catch (error) {
      return {
        canBackup: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}