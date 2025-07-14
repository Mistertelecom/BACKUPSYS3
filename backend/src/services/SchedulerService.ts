import cron from 'node-cron';
import { BackupJobModel } from '../models/BackupJob';
import { EquipamentoModel } from '../models/Equipamento';
import { ProviderModel } from '../models/Provider';
import { BackupModel } from '../models/Backup';
import { providerService } from './ProviderService';
import { SSHService } from './SSHService';
import { BackupScriptService } from './BackupScriptService';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SchedulerService {
  private scheduledJobs: Map<number, cron.ScheduledTask> = new Map();
  private autoBackupJobs: Map<number, cron.ScheduledTask> = new Map();
  private isRunning = false;

  async initialize() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🕐 Scheduler Service inicializado');
    
    // Load existing scheduled jobs
    await this.loadScheduledJobs();
    
    // Load automated SSH backup jobs
    await this.loadAutoBackupJobs();
    
    // Start periodic check for due jobs
    this.startPeriodicCheck();
  }

  private async loadScheduledJobs() {
    try {
      const activeJobs = await BackupJobModel.getActive();
      
      for (const job of activeJobs) {
        this.scheduleJob(job);
      }
      
      console.log(`📅 ${activeJobs.length} jobs agendados carregados`);
    } catch (error) {
      console.error('Erro ao carregar jobs agendados:', error);
    }
  }

  private async loadAutoBackupJobs() {
    try {
      const equipamentos = await EquipamentoModel.getAutoBackupEnabled();
      
      for (const equipamento of equipamentos) {
        this.scheduleAutoBackupJob(equipamento);
      }
      
      console.log(`🔄 ${equipamentos.length} jobs de backup automatizado carregados`);
    } catch (error) {
      console.error('Erro ao carregar jobs de backup automatizado:', error);
    }
  }

  private scheduleJob(job: any) {
    try {
      // Validate cron pattern
      if (!cron.validate(job.schedule_pattern)) {
        console.error(`Padrão de agendamento inválido para job ${job.id}: ${job.schedule_pattern}`);
        return;
      }

      // Remove existing job if it exists
      const existingJob = this.scheduledJobs.get(job.id);
      if (existingJob) {
        existingJob.stop();
        this.scheduledJobs.delete(job.id);
      }

      // Schedule new job
      const scheduledTask = cron.schedule(job.schedule_pattern, async () => {
        await this.executeBackupJob(job);
      }, {
        scheduled: true,
        timezone: 'America/Sao_Paulo'
      });

      this.scheduledJobs.set(job.id, scheduledTask);
      console.log(`📋 Job ${job.id} agendado: ${job.schedule_pattern}`);
    } catch (error) {
      console.error(`Erro ao agendar job ${job.id}:`, error);
    }
  }

  private async executeBackupJob(job: any) {
    console.log(`🔄 Executando backup job ${job.id}`);
    
    try {
      // Update job status
      await BackupJobModel.updateStatus(job.id, 'running');
      
      // Get equipment and provider
      const equipamento = await EquipamentoModel.getById(job.equipamento_id);
      const provider = await ProviderModel.getById(job.provider_id);
      
      if (!equipamento || !provider) {
        throw new Error('Equipamento ou provider não encontrado');
      }

      // Create backup file
      const backupFile = await this.createBackupFile(equipamento);
      
      // Upload to provider
      const providerInstance = await providerService.initializeProvider(provider);
      const uploadResult = await providerInstance.uploadFile(backupFile, equipamento.id!);
      
      // Save backup record
      await BackupModel.create({
        equipamento_id: equipamento.id!,
        nome_arquivo: backupFile.originalname,
        caminho: backupFile.path,
        provider_type: provider.type,
        provider_path: uploadResult.provider_path,
        file_size: uploadResult.file_size,
        checksum: uploadResult.checksum,
        status: 'active'
      });

      // Update job status and last run
      await BackupJobModel.updateStatus(job.id, 'completed');
      await BackupJobModel.updateLastRun(job.id, new Date().toISOString());
      
      console.log(`✅ Backup job ${job.id} executado com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao executar backup job ${job.id}:`, error);
      await BackupJobModel.updateStatus(job.id, 'failed');
    }
  }

  private async createBackupFile(equipamento: any): Promise<Express.Multer.File> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${equipamento.nome}_${timestamp}.tar.gz`;
    const tempDir = path.join(process.cwd(), 'temp_backups');
    const filePath = path.join(tempDir, fileName);

    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    try {
      // Create a sample backup file (in production, this would connect to the actual equipment)
      const backupData = {
        equipamento: equipamento.nome,
        ip: equipamento.ip,
        tipo: equipamento.tipo,
        timestamp: new Date().toISOString(),
        config: `# Backup configuration for ${equipamento.nome}
# IP: ${equipamento.ip}
# Type: ${equipamento.tipo}
# Generated: ${new Date().toISOString()}

# This is a sample backup file
# In production, this would contain actual equipment configuration
hostname ${equipamento.nome}
ip address ${equipamento.ip}
description ${equipamento.tipo}
backup-date ${new Date().toISOString()}
`
      };

      // Write backup data to file
      fs.writeFileSync(filePath, backupData.config);
      
      // Create tar.gz archive
      const archivePath = filePath.replace('.tar.gz', '_archive.tar.gz');
      await execAsync(`tar -czf "${archivePath}" -C "${tempDir}" "${fileName}"`);
      
      // Remove original file
      fs.unlinkSync(filePath);
      
      // Get file stats
      const stats = fs.statSync(archivePath);
      
      // Return file object similar to multer
      return {
        fieldname: 'backup',
        originalname: fileName,
        encoding: '7bit',
        mimetype: 'application/gzip',
        destination: tempDir,
        filename: fileName,
        path: archivePath,
        size: stats.size
      } as Express.Multer.File;
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw error;
    }
  }

  private startPeriodicCheck() {
    // Check for due jobs every minute
    cron.schedule('* * * * *', async () => {
      try {
        const dueJobs = await BackupJobModel.getDueJobs();
        
        for (const job of dueJobs) {
          if (job.status !== 'running') {
            await this.executeBackupJob(job);
          }
        }
      } catch (error) {
        console.error('Erro na verificação periódica de jobs:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    });
  }

  async addJob(jobData: any) {
    try {
      const job = await BackupJobModel.create(jobData);
      this.scheduleJob(job);
      return job;
    } catch (error) {
      console.error('Erro ao adicionar job:', error);
      throw error;
    }
  }

  async updateJob(jobId: number, jobData: any) {
    try {
      const job = await BackupJobModel.update(jobId, jobData);
      if (job) {
        this.scheduleJob(job);
      }
      return job;
    } catch (error) {
      console.error('Erro ao atualizar job:', error);
      throw error;
    }
  }

  async removeJob(jobId: number) {
    try {
      const existingJob = this.scheduledJobs.get(jobId);
      if (existingJob) {
        existingJob.stop();
        this.scheduledJobs.delete(jobId);
      }
      
      await BackupJobModel.delete(jobId);
    } catch (error) {
      console.error('Erro ao remover job:', error);
      throw error;
    }
  }

  async pauseJob(jobId: number) {
    try {
      const existingJob = this.scheduledJobs.get(jobId);
      if (existingJob) {
        existingJob.stop();
      }
      
      await BackupJobModel.update(jobId, { is_active: false });
    } catch (error) {
      console.error('Erro ao pausar job:', error);
      throw error;
    }
  }

  async resumeJob(jobId: number) {
    try {
      const job = await BackupJobModel.getById(jobId);
      if (job) {
        await BackupJobModel.update(jobId, { is_active: true });
        this.scheduleJob(job);
      }
    } catch (error) {
      console.error('Erro ao resumir job:', error);
      throw error;
    }
  }

  getScheduledJobsCount(): number {
    return this.scheduledJobs.size;
  }

  getScheduledJobs(): number[] {
    return Array.from(this.scheduledJobs.keys());
  }

  private scheduleAutoBackupJob(equipamento: any) {
    try {
      if (!equipamento.auto_backup_schedule || !cron.validate(equipamento.auto_backup_schedule)) {
        console.error(`Padrão de agendamento inválido para equipamento ${equipamento.id}: ${equipamento.auto_backup_schedule}`);
        return;
      }

      // Remove existing job if it exists
      const existingJob = this.autoBackupJobs.get(equipamento.id);
      if (existingJob) {
        existingJob.stop();
        this.autoBackupJobs.delete(equipamento.id);
      }

      // Schedule new job
      const scheduledTask = cron.schedule(equipamento.auto_backup_schedule, async () => {
        await this.executeAutoBackup(equipamento);
      }, {
        scheduled: true,
        timezone: 'America/Sao_Paulo'
      });

      this.autoBackupJobs.set(equipamento.id, scheduledTask);
      console.log(`🔄 Auto backup job ${equipamento.id} (${equipamento.nome}) agendado: ${equipamento.auto_backup_schedule}`);
    } catch (error) {
      console.error(`Erro ao agendar auto backup job ${equipamento.id}:`, error);
    }
  }

  private async executeAutoBackup(equipamento: any) {
    console.log(`🚀 Executando backup automático para ${equipamento.nome} (${equipamento.ip})`);
    
    try {
      // Create SSH service instance
      const sshConfig = {
        host: equipamento.ip,
        port: equipamento.ssh_port || 22,
        username: equipamento.ssh_username || '',
        password: equipamento.ssh_password,
        privateKey: equipamento.ssh_private_key
      };

      // Execute backup
      const backupScriptService = new BackupScriptService();
      const result = await backupScriptService.executeAutoBackup(equipamento.id!, equipamento.nome, equipamento.tipo, sshConfig);

      if (result.success) {
        console.log(`✅ Backup automático executado com sucesso para ${equipamento.nome}`);
        
        // Register backup in database with metadata
        const backupRecord = await BackupModel.create({
          equipamento_id: equipamento.id!,
          nome_arquivo: result.backupFile || `auto-backup-${equipamento.nome}-${new Date().toISOString()}.tar.gz`,
          caminho: result.localFilePath || '',
          provider_type: 'local',
          provider_path: result.localFilePath,
          file_size: 0,
          status: 'active'
        });

        console.log(`📊 Backup registrado no banco: ID ${backupRecord.id}`);
      } else {
        console.error(`❌ Falha no backup automático para ${equipamento.nome}: ${result.error}`);
      }

    } catch (error) {
      console.error(`❌ Erro crítico no backup automático para ${equipamento.nome}:`, error);
    }
  }

  async addAutoBackupJob(equipamento: any) {
    if (equipamento.auto_backup_enabled && equipamento.auto_backup_schedule) {
      this.scheduleAutoBackupJob(equipamento);
    }
  }

  async updateAutoBackupJob(equipamento: any) {
    // Remove existing job
    const existingJob = this.autoBackupJobs.get(equipamento.id);
    if (existingJob) {
      existingJob.stop();
      this.autoBackupJobs.delete(equipamento.id);
    }

    // Add new job if enabled
    if (equipamento.auto_backup_enabled && equipamento.auto_backup_schedule) {
      this.scheduleAutoBackupJob(equipamento);
    }
  }

  async removeAutoBackupJob(equipamentoId: number) {
    const existingJob = this.autoBackupJobs.get(equipamentoId);
    if (existingJob) {
      existingJob.stop();
      this.autoBackupJobs.delete(equipamentoId);
      console.log(`🗑️ Auto backup job removido para equipamento ${equipamentoId}`);
    }
  }

  getAutoBackupJobsCount(): number {
    return this.autoBackupJobs.size;
  }

  stop() {
    this.scheduledJobs.forEach((job, id) => {
      job.stop();
    });
    this.scheduledJobs.clear();
    
    this.autoBackupJobs.forEach((job, id) => {
      job.stop();
    });
    this.autoBackupJobs.clear();
    
    this.isRunning = false;
    console.log('🛑 Scheduler Service parado');
  }
}

export const schedulerService = new SchedulerService();