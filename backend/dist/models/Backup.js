"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupModel = void 0;
const database_1 = require("../database/database");
class BackupModel {
    static async getAll() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM backups ORDER BY data_upload DESC';
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
            const sql = 'SELECT * FROM backups WHERE id = ?';
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
    static async getByEquipamentoId(equipamentoId) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM backups WHERE equipamento_id = ? ORDER BY data_upload DESC';
            database_1.database.getDatabase().all(sql, [equipamentoId], (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows);
                }
            });
        });
    }
    static async create(backupData) {
        return new Promise((resolve, reject) => {
            const sql = 'INSERT INTO backups (equipamento_id, nome_arquivo, caminho) VALUES (?, ?, ?)';
            database_1.database.getDatabase().run(sql, [backupData.equipamento_id, backupData.nome_arquivo, backupData.caminho], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    BackupModel.getById(this.lastID).then((backup) => {
                        if (backup) {
                            resolve(backup);
                        }
                        else {
                            reject(new Error('Backup criado mas não encontrado'));
                        }
                    }).catch(reject);
                }
            });
        });
    }
    static async delete(id) {
        return new Promise((resolve, reject) => {
            const sql = 'DELETE FROM backups WHERE id = ?';
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
    static async getWithEquipamento() {
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
    static async getRecentBackups(limit = 5) {
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
            database_1.database.getDatabase().all(sql, [limit], (err, rows) => {
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
exports.BackupModel = BackupModel;
//# sourceMappingURL=Backup.js.map