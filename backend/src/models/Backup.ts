import { database } from '../database/database';

export interface Backup {
  id?: number;
  equipamento_id: number;
  nome_arquivo: string;
  caminho: string;
  data_upload?: string;
}

export class BackupModel {
  static async getAll(): Promise<Backup[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM backups ORDER BY data_upload DESC';
      
      database.getDatabase().all(sql, [], (err, rows: Backup[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getById(id: number): Promise<Backup | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM backups WHERE id = ?';
      
      database.getDatabase().get(sql, [id], (err, row: Backup) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  static async getByEquipamentoId(equipamentoId: number): Promise<Backup[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM backups WHERE equipamento_id = ? ORDER BY data_upload DESC';
      
      database.getDatabase().all(sql, [equipamentoId], (err, rows: Backup[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async create(backupData: Omit<Backup, 'id' | 'data_upload'>): Promise<Backup> {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO backups (equipamento_id, nome_arquivo, caminho) VALUES (?, ?, ?)';
      
      database.getDatabase().run(sql, [backupData.equipamento_id, backupData.nome_arquivo, backupData.caminho], function(err) {
        if (err) {
          reject(err);
        } else {
          BackupModel.getById(this.lastID).then((backup) => {
            if (backup) {
              resolve(backup);
            } else {
              reject(new Error('Backup criado mas não encontrado'));
            }
          }).catch(reject);
        }
      });
    });
  }

  static async delete(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM backups WHERE id = ?';
      
      database.getDatabase().run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async getWithEquipamento(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          b.*,
          e.nome as equipamento_nome,
          e.ip as equipamento_ip,
          e.tipo as equipamento_tipo
        FROM backups b
        JOIN equipamentos e ON b.equipamento_id = e.id
        ORDER BY b.data_upload DESC
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

  static async getRecentBackups(limit: number = 5): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          b.*,
          e.nome as equipamento_nome,
          e.ip as equipamento_ip
        FROM backups b
        JOIN equipamentos e ON b.equipamento_id = e.id
        ORDER BY b.data_upload DESC
        LIMIT ?
      `;
      
      database.getDatabase().all(sql, [limit], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}