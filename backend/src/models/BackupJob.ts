import { database } from '../database/database';

export interface BackupJob {
  id?: number;
  equipamento_id: number;
  provider_id: number;
  schedule_pattern: string;
  is_active: boolean;
  last_run?: string;
  next_run?: string;
  status: string;
  created_at?: string;
}

export class BackupJobModel {
  static async getAll(): Promise<BackupJob[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM backup_jobs ORDER BY created_at DESC';
      
      database.getDatabase().all(sql, [], (err, rows: BackupJob[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getById(id: number): Promise<BackupJob | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM backup_jobs WHERE id = ?';
      
      database.getDatabase().get(sql, [id], (err, row: BackupJob) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  static async getByEquipamentoId(equipamentoId: number): Promise<BackupJob[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM backup_jobs WHERE equipamento_id = ? ORDER BY created_at DESC';
      
      database.getDatabase().all(sql, [equipamentoId], (err, rows: BackupJob[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getActive(): Promise<BackupJob[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM backup_jobs WHERE is_active = 1 ORDER BY next_run ASC';
      
      database.getDatabase().all(sql, [], (err, rows: BackupJob[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getDueJobs(): Promise<BackupJob[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM backup_jobs WHERE is_active = 1 AND next_run <= datetime("now") ORDER BY next_run ASC';
      
      database.getDatabase().all(sql, [], (err, rows: BackupJob[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getWithDetails(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          bj.*,
          e.nome as equipamento_nome,
          e.ip as equipamento_ip,
          p.name as provider_name,
          p.type as provider_type
        FROM backup_jobs bj
        JOIN equipamentos e ON bj.equipamento_id = e.id
        JOIN providers p ON bj.provider_id = p.id
        ORDER BY bj.created_at DESC
      `;
      
      database.getDatabase().all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async create(jobData: Omit<BackupJob, 'id' | 'created_at'>): Promise<BackupJob> {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO backup_jobs (equipamento_id, provider_id, schedule_pattern, is_active, last_run, next_run, status) VALUES (?, ?, ?, ?, ?, ?, ?)';
      
      database.getDatabase().run(sql, [
        jobData.equipamento_id,
        jobData.provider_id,
        jobData.schedule_pattern,
        jobData.is_active,
        jobData.last_run,
        jobData.next_run,
        jobData.status
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          BackupJobModel.getById(this.lastID).then((job) => {
            if (job) {
              resolve(job);
            } else {
              reject(new Error('Backup job criado mas não encontrado'));
            }
          }).catch(reject);
        }
      });
    });
  }

  static async update(id: number, jobData: Partial<Omit<BackupJob, 'id' | 'created_at'>>): Promise<BackupJob | null> {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (jobData.equipamento_id !== undefined) {
        fields.push('equipamento_id = ?');
        values.push(jobData.equipamento_id);
      }
      if (jobData.provider_id !== undefined) {
        fields.push('provider_id = ?');
        values.push(jobData.provider_id);
      }
      if (jobData.schedule_pattern !== undefined) {
        fields.push('schedule_pattern = ?');
        values.push(jobData.schedule_pattern);
      }
      if (jobData.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(jobData.is_active);
      }
      if (jobData.last_run !== undefined) {
        fields.push('last_run = ?');
        values.push(jobData.last_run);
      }
      if (jobData.next_run !== undefined) {
        fields.push('next_run = ?');
        values.push(jobData.next_run);
      }
      if (jobData.status !== undefined) {
        fields.push('status = ?');
        values.push(jobData.status);
      }
      
      if (fields.length === 0) {
        resolve(null);
        return;
      }
      
      values.push(id);
      const sql = `UPDATE backup_jobs SET ${fields.join(', ')} WHERE id = ?`;
      
      database.getDatabase().run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          BackupJobModel.getById(id).then(resolve).catch(reject);
        }
      });
    });
  }

  static async delete(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM backup_jobs WHERE id = ?';
      
      database.getDatabase().run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async updateLastRun(id: number, lastRun: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE backup_jobs SET last_run = ? WHERE id = ?';
      
      database.getDatabase().run(sql, [lastRun, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  static async updateStatus(id: number, status: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE backup_jobs SET status = ? WHERE id = ?';
      
      database.getDatabase().run(sql, [status, id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}