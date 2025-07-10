import { database } from '../database/database';

export interface Provider {
  id?: number;
  name: string;
  type: string;
  config: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProviderConfig {
  [key: string]: any;
}

export class ProviderModel {
  static async getAll(): Promise<Provider[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM providers ORDER BY created_at DESC';
      
      database.getDatabase().all(sql, [], (err, rows: Provider[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async getById(id: number): Promise<Provider | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM providers WHERE id = ?';
      
      database.getDatabase().get(sql, [id], (err, row: Provider) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  static async getByType(type: string): Promise<Provider | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM providers WHERE type = ? AND is_active = 1';
      
      database.getDatabase().get(sql, [type], (err, row: Provider) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  static async getActive(): Promise<Provider[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM providers WHERE is_active = 1 ORDER BY created_at DESC';
      
      database.getDatabase().all(sql, [], (err, rows: Provider[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  static async create(providerData: Omit<Provider, 'id' | 'created_at' | 'updated_at'>): Promise<Provider> {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO providers (name, type, config, is_active) VALUES (?, ?, ?, ?)';
      
      database.getDatabase().run(sql, [
        providerData.name,
        providerData.type,
        providerData.config,
        providerData.is_active
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          ProviderModel.getById(this.lastID).then((provider) => {
            if (provider) {
              resolve(provider);
            } else {
              reject(new Error('Provider criado mas não encontrado'));
            }
          }).catch(reject);
        }
      });
    });
  }

  static async update(id: number, providerData: Partial<Omit<Provider, 'id' | 'created_at' | 'updated_at'>>): Promise<Provider | null> {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (providerData.name !== undefined) {
        fields.push('name = ?');
        values.push(providerData.name);
      }
      if (providerData.type !== undefined) {
        fields.push('type = ?');
        values.push(providerData.type);
      }
      if (providerData.config !== undefined) {
        fields.push('config = ?');
        values.push(providerData.config);
      }
      if (providerData.is_active !== undefined) {
        fields.push('is_active = ?');
        values.push(providerData.is_active);
      }
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      
      if (fields.length === 1) { // Only updated_at
        resolve(null);
        return;
      }
      
      values.push(id);
      const sql = `UPDATE providers SET ${fields.join(', ')} WHERE id = ?`;
      
      database.getDatabase().run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          ProviderModel.getById(id).then(resolve).catch(reject);
        }
      });
    });
  }

  static async delete(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM providers WHERE id = ?';
      
      database.getDatabase().run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes > 0);
        }
      });
    });
  }

  static async toggleActive(id: number): Promise<Provider | null> {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE providers SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      
      database.getDatabase().run(sql, [id], function(err) {
        if (err) {
          reject(err);
        } else {
          ProviderModel.getById(id).then(resolve).catch(reject);
        }
      });
    });
  }
}