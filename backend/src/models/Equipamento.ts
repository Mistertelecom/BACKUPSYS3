import { database } from '../database/database';

export interface Equipamento {
  id?: number;
  nome: string;
  ip: string;
  tipo: string;
  ssh_enabled?: boolean;
  ssh_port?: number;
  ssh_username?: string;
  ssh_password?: string;
  ssh_private_key?: string;
  http_enabled?: boolean;
  http_port?: number;
  http_protocol?: 'http' | 'https';
  http_username?: string;
  http_password?: string;
  http_ignore_ssl?: boolean;
  auto_backup_enabled?: boolean;
  auto_backup_schedule?: string;
  created_at?: string;
}

export interface SSHConfigData {
  ssh_enabled: boolean;
  ssh_port: number;
  ssh_username: string | null;
  ssh_password: string | null;
  ssh_private_key: string | null;
  auto_backup_enabled: boolean;
  auto_backup_schedule: string;
}

export interface HTTPConfigData {
  http_enabled: boolean;
  http_port: number;
  http_protocol: 'http' | 'https';
  http_username: string | null;
  http_password: string | null;
  http_ignore_ssl: boolean;
  auto_backup_enabled: boolean;
  auto_backup_schedule: string;
}

export class EquipamentoModel {
  static async getAll(): Promise<Equipamento[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM equipamentos ORDER BY created_at DESC';
      
      database.getDatabase().all(sql, [], (err, rows: Equipamento[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getById(id: number): Promise<Equipamento | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM equipamentos WHERE id = ?';
      
      database.getDatabase().get(sql, [id], (err, row: Equipamento) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  static async create(equipamentoData: Omit<Equipamento, 'id' | 'created_at'>): Promise<Equipamento> {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO equipamentos (nome, ip, tipo) VALUES (?, ?, ?)';
      
      database.getDatabase().run(sql, [equipamentoData.nome, equipamentoData.ip, equipamentoData.tipo], function(err) {
        if (err) {
          reject(err);
        } else {
          EquipamentoModel.getById(this.lastID).then((equipamento) => {
            if (equipamento) {
              resolve(equipamento);
            } else {
              reject(new Error('Equipamento criado mas não encontrado'));
            }
          }).catch(reject);
        }
      });
    });
  }

  static async update(id: number, equipamentoData: Partial<Omit<Equipamento, 'id' | 'created_at'>>): Promise<Equipamento | null> {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (equipamentoData.nome) {
        fields.push('nome = ?');
        values.push(equipamentoData.nome);
      }
      if (equipamentoData.ip) {
        fields.push('ip = ?');
        values.push(equipamentoData.ip);
      }
      if (equipamentoData.tipo) {
        fields.push('tipo = ?');
        values.push(equipamentoData.tipo);
      }
      
      if (fields.length === 0) {
        resolve(null);
        return;
      }
      
      values.push(id);
      const sql = `UPDATE equipamentos SET ${fields.join(', ')} WHERE id = ?`;
      
      database.getDatabase().run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          EquipamentoModel.getById(id).then(resolve).catch(reject);
        }
      });
    });
  }

  static async delete(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM equipamentos WHERE id = ?';
      
      database.getDatabase().run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async getWithBackupCount(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          e.*,
          COUNT(b.id) as backup_count
        FROM equipamentos e
        LEFT JOIN backups b ON e.id = b.equipamento_id
        GROUP BY e.id
        ORDER BY e.created_at DESC
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

  static async updateSSHConfig(id: number, sshConfig: SSHConfigData): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE equipamentos SET 
          ssh_enabled = ?,
          ssh_port = ?,
          ssh_username = ?,
          ssh_password = ?,
          ssh_private_key = ?,
          auto_backup_enabled = ?,
          auto_backup_schedule = ?
        WHERE id = ?
      `;
      
      const values = [
        sshConfig.ssh_enabled ? 1 : 0,
        sshConfig.ssh_port,
        sshConfig.ssh_username,
        sshConfig.ssh_password,
        sshConfig.ssh_private_key,
        sshConfig.auto_backup_enabled ? 1 : 0,
        sshConfig.auto_backup_schedule,
        id
      ];
      
      database.getDatabase().run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async updateAutoBackupConfig(id: number, config: {
    ssh_enabled?: boolean;
    ssh_port?: number;
    ssh_username?: string | null;
    ssh_password?: string | null;
    ssh_private_key?: string | null;
    http_enabled?: boolean;
    http_port?: number;
    http_protocol?: 'http' | 'https';
    http_username?: string | null;
    http_password?: string | null;
    http_ignore_ssl?: boolean;
    auto_backup_enabled?: boolean;
    auto_backup_schedule?: string;
  }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE equipamentos SET 
          ssh_enabled = ?,
          ssh_port = ?,
          ssh_username = ?,
          ssh_password = ?,
          ssh_private_key = ?,
          http_enabled = ?,
          http_port = ?,
          http_protocol = ?,
          http_username = ?,
          http_password = ?,
          http_ignore_ssl = ?,
          auto_backup_enabled = ?,
          auto_backup_schedule = ?
        WHERE id = ?
      `;
      
      const values = [
        config.ssh_enabled ? 1 : 0,
        config.ssh_port || 22,
        config.ssh_username,
        config.ssh_password,
        config.ssh_private_key,
        config.http_enabled ? 1 : 0,
        config.http_port || 80,
        config.http_protocol || 'http',
        config.http_username,
        config.http_password,
        config.http_ignore_ssl ? 1 : 0,
        config.auto_backup_enabled ? 1 : 0,
        config.auto_backup_schedule || '0 2 * * *',
        id
      ];
      
      database.getDatabase().run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async getWithAutoBackupEnabled(): Promise<Equipamento[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM equipamentos 
        WHERE auto_backup_enabled = 1 AND (ssh_enabled = 1 OR http_enabled = 1)
        ORDER BY nome
      `;
      
      database.getDatabase().all(sql, [], (err, rows: Equipamento[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getSSHEnabled(): Promise<Equipamento[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM equipamentos 
        WHERE ssh_enabled = 1
        ORDER BY nome
      `;
      
      database.getDatabase().all(sql, [], (err, rows: Equipamento[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getAutoBackupEnabled(): Promise<Equipamento[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM equipamentos 
        WHERE (ssh_enabled = 1 OR http_enabled = 1)
        AND auto_backup_enabled = 1
        AND auto_backup_schedule IS NOT NULL
        ORDER BY nome
      `;
      
      database.getDatabase().all(sql, [], (err, rows: Equipamento[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}