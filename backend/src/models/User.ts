import { database } from '../database/database';
import bcrypt from 'bcryptjs';

export interface User {
  id?: number;
  username: string;
  password: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export class UserModel {
  static async findByUsername(username: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ? AND is_active = 1';
      
      database.getDatabase().get(sql, [username], (err, row: User) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  static async findById(id: number): Promise<User | null> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE id = ? AND is_active = 1';
      
      database.getDatabase().get(sql, [id], (err, row: User) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  static async create(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
    return new Promise((resolve, reject) => {
      const hashedPassword = bcrypt.hashSync(userData.password, 10);
      const sql = 'INSERT INTO users (username, password) VALUES (?, ?)';
      
      database.getDatabase().run(sql, [userData.username, hashedPassword], function(err) {
        if (err) {
          reject(err);
        } else {
          UserModel.findById(this.lastID).then((user) => {
            if (user) {
              resolve(user);
            } else {
              reject(new Error('Usuário criado mas não encontrado'));
            }
          }).catch(reject);
        }
      });
    });
  }

  static async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async getAllUsers(): Promise<User[]> {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, username, created_at FROM users ORDER BY created_at DESC';
      
      database.getDatabase().all(sql, [], (err, rows: User[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}