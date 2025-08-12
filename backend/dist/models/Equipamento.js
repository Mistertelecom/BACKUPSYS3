"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EquipamentoModel = void 0;
const database_1 = require("../database/database");
class EquipamentoModel {
    static async getAll() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM equipamentos ORDER BY created_at DESC';
            database_1.database.getDatabase().all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    static async getById(id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM equipamentos WHERE id = ?';
            database_1.database.getDatabase().get(sql, [id], (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row || null);
                }
            });
        });
    }
    static async create(equipamentoData) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO equipamentos (nome, ip, tipo) VALUES (?, ?, ?)';
            database_1.database.getDatabase().run(sql, [equipamentoData.nome, equipamentoData.ip, equipamentoData.tipo], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    EquipamentoModel.getById(this.lastID).then((equipamento) => {
                        if (equipamento) {
                            resolve(equipamento);
                        }
                        else {
                            reject(new Error('Equipamento criado mas não encontrado'));
                        }
                    }).catch(reject);
                }
            });
        });
    }
    static async update(id, equipamentoData) {
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
            database_1.database.getDatabase().run(sql, values, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    EquipamentoModel.getById(id).then(resolve).catch(reject);
                }
            });
        });
    }
    static async delete(id) {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM equipamentos WHERE id = ?';
            database_1.database.getDatabase().run(sql, [id], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
        });
    }
    static async getWithBackupCount() {
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
            database_1.database.getDatabase().all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    static async updateSSHConfig(id, sshConfig) {
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
            database_1.database.getDatabase().run(sql, values, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this.changes > 0);
                }
            });
        });
    }
    static async getWithAutoBackupEnabled() {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT * FROM equipamentos 
        WHERE auto_backup_enabled = 1 AND (ssh_enabled = 1 OR http_enabled = 1)
        ORDER BY nome
      `;
            database_1.database.getDatabase().all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    static async getSSHEnabled() {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT * FROM equipamentos 
        WHERE ssh_enabled = 1
        ORDER BY nome
      `;
            database_1.database.getDatabase().all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    static async getAutoBackupEnabled() {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT * FROM equipamentos 
        WHERE (ssh_enabled = 1 OR http_enabled = 1)
        AND auto_backup_enabled = 1
        AND auto_backup_schedule IS NOT NULL
        ORDER BY nome
      `;
            database_1.database.getDatabase().all(sql, [], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
}
exports.EquipamentoModel = EquipamentoModel;
//# sourceMappingURL=Equipamento.js.map