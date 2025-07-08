import sqlite3 from 'sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATABASE_PATH = process.env.DATABASE_PATH || './database.sqlite';

export class Database {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(DATABASE_PATH, (err) => {
      if (err) {
        console.error('Erro ao conectar com o banco de dados:', err);
      } else {
        console.log('Conectado ao banco SQLite');
        this.initTables();
      }
    });
  }

  private initTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createEquipamentosTable = `
      CREATE TABLE IF NOT EXISTS equipamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        ip TEXT NOT NULL,
        tipo TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createBackupsTable = `
      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipamento_id INTEGER NOT NULL,
        nome_arquivo TEXT NOT NULL,
        caminho TEXT NOT NULL,
        data_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipamento_id) REFERENCES equipamentos (id)
      )
    `;

    this.db.serialize(() => {
      this.db.run(createUsersTable);
      this.db.run(createEquipamentosTable);
      this.db.run(createBackupsTable);
      
      this.createDefaultUser();
    });
  }

  private createDefaultUser() {
    const checkUser = `SELECT COUNT(*) as count FROM users WHERE username = ?`;
    
    this.db.get(checkUser, ['admin'], (err, row: any) => {
      if (err) {
        console.error('Erro ao verificar usuário:', err);
        return;
      }
      
      if (row.count === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        const insertUser = `INSERT INTO users (username, password) VALUES (?, ?)`;
        
        this.db.run(insertUser, ['admin', hashedPassword], (err) => {
          if (err) {
            console.error('Erro ao criar usuário padrão:', err);
          } else {
            console.log('Usuário padrão criado: admin / admin123');
          }
        });
      }
    });
  }

  public getDatabase(): sqlite3.Database {
    return this.db;
  }

  public close() {
    this.db.close((err) => {
      if (err) {
        console.error('Erro ao fechar banco de dados:', err);
      } else {
        console.log('Conexão com banco de dados fechada');
      }
    });
  }
}

export const database = new Database();