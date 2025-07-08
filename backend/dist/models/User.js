"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const database_1 = require("../database/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class UserModel {
    static async findByUsername(username) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM users WHERE username = ?';
            database_1.database.getDatabase().get(sql, [username], (err, row) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(row || null);
                }
            });
        });
    }
    static async findById(id) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM users WHERE id = ?';
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
    static async create(userData) {
        return new Promise((resolve, reject) => {
            const hashedPassword = bcryptjs_1.default.hashSync(userData.password, 10);
            const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
            database_1.database.getDatabase().run(sql, [userData.username, hashedPassword], function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    UserModel.findById(this.lastID).then((user) => {
                        if (user) {
                            resolve(user);
                        }
                        else {
                            reject(new Error('Usuário criado mas não encontrado'));
                        }
                    }).catch(reject);
                }
            });
        });
    }
    static async validatePassword(plainPassword, hashedPassword) {
        return bcryptjs_1.default.compare(plainPassword, hashedPassword);
    }
    static async getAllUsers() {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT id, username, created_at FROM users ORDER BY created_at DESC';
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
exports.UserModel = UserModel;
//# sourceMappingURL=User.js.map