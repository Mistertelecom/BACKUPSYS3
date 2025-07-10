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
        ssh_enabled BOOLEAN DEFAULT 0,
        ssh_port INTEGER DEFAULT 22,
        ssh_username TEXT,
        ssh_password TEXT,
        ssh_private_key TEXT,
        auto_backup_enabled BOOLEAN DEFAULT 0,
        auto_backup_schedule TEXT DEFAULT '0 2 * * *',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createBackupsTable = `
      CREATE TABLE IF NOT EXISTS backups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipamento_id INTEGER NOT NULL,
        nome_arquivo TEXT NOT NULL,
        caminho TEXT NOT NULL,
        provider_type TEXT DEFAULT 'local',
        provider_path TEXT,
        file_size INTEGER,
        checksum TEXT,
        status TEXT DEFAULT 'active',
        metadata TEXT,
        data_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipamento_id) REFERENCES equipamentos (id)
      )
    `;

    const createProvidersTable = `
      CREATE TABLE IF NOT EXISTS providers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createBackupJobsTable = `
      CREATE TABLE IF NOT EXISTS backup_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipamento_id INTEGER NOT NULL,
        provider_id INTEGER NOT NULL,
        schedule_pattern TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        last_run DATETIME,
        next_run DATETIME,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipamento_id) REFERENCES equipamentos (id),
        FOREIGN KEY (provider_id) REFERENCES providers (id)
      )
    `;

    const createBackupHistoryTable = `
      CREATE TABLE IF NOT EXISTS backup_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (backup_id) REFERENCES backups (id)
      )
    `;

    this.db.serialize(() => {
      this.db.run(createUsersTable);
      this.db.run(createEquipamentosTable);
      this.db.run(createProvidersTable);
      this.db.run(createBackupsTable);
      this.db.run(createBackupJobsTable);
      this.db.run(createBackupHistoryTable);
      
      this.runMigrations();
      this.createDefaultUser();
      this.createDefaultProviders();
    });
  }

  private runMigrations() {
    // Adicionar coluna metadata à tabela backups se não existir
    this.db.run(`ALTER TABLE backups ADD COLUMN metadata TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Erro ao adicionar coluna metadata:', err);
      }
    });

    // Adicionar colunas SSH à tabela equipamentos
    const sshColumns = [
      'ALTER TABLE equipamentos ADD COLUMN ssh_enabled BOOLEAN DEFAULT 0',
      'ALTER TABLE equipamentos ADD COLUMN ssh_port INTEGER DEFAULT 22',
      'ALTER TABLE equipamentos ADD COLUMN ssh_username TEXT',
      'ALTER TABLE equipamentos ADD COLUMN ssh_password TEXT',
      'ALTER TABLE equipamentos ADD COLUMN ssh_private_key TEXT',
      'ALTER TABLE equipamentos ADD COLUMN auto_backup_enabled BOOLEAN DEFAULT 0',
      'ALTER TABLE equipamentos ADD COLUMN auto_backup_schedule TEXT DEFAULT "0 2 * * *"'
    ];

    sshColumns.forEach(sql => {
      this.db.run(sql, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Erro ao adicionar coluna SSH:', err);
        }
      });
    });

    // Adicionar colunas HTTP à tabela equipamentos (para Mimosa)
    const httpColumns = [
      'ALTER TABLE equipamentos ADD COLUMN http_enabled BOOLEAN DEFAULT 0',
      'ALTER TABLE equipamentos ADD COLUMN http_port INTEGER DEFAULT 80',
      'ALTER TABLE equipamentos ADD COLUMN http_protocol TEXT DEFAULT "http"',
      'ALTER TABLE equipamentos ADD COLUMN http_username TEXT',
      'ALTER TABLE equipamentos ADD COLUMN http_password TEXT',
      'ALTER TABLE equipamentos ADD COLUMN http_ignore_ssl BOOLEAN DEFAULT 0'
    ];

    httpColumns.forEach(sql => {
      this.db.run(sql, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Erro ao adicionar coluna HTTP:', err);
        }
      });
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

  private createDefaultProviders() {
    const checkProviders = `SELECT COUNT(*) as count FROM providers`;
    
    this.db.get(checkProviders, [], (err, row: any) => {
      if (err) {
        console.error('Erro ao verificar providers:', err);
        return;
      }
      
      if (row.count === 0) {
        const defaultProviders = [
          {
            name: 'Local Storage',
            type: 'local',
            config: JSON.stringify({
              path: './uploads'
            })
          },
          {
            name: 'AWS S3',
            type: 'aws-s3',
            config: JSON.stringify({
              bucket: '',
              region: 'us-east-1',
              accessKeyId: '',
              secretAccessKey: ''
            })
          },
          {
            name: 'Google Cloud Storage',
            type: 'gcs',
            config: JSON.stringify({
              bucket: '',
              projectId: '',
              keyFilename: ''
            })
          }
        ];

        const insertProvider = `INSERT INTO providers (name, type, config, is_active) VALUES (?, ?, ?, ?)`;
        
        defaultProviders.forEach((provider, index) => {
          const isActive = index === 0 ? 1 : 0; // Only local is active by default
          this.db.run(insertProvider, [provider.name, provider.type, provider.config, isActive], (err) => {
            if (err) {
              console.error('Erro ao criar provider padrão:', err);
            } else {
              console.log(`Provider ${provider.name} criado`);
            }
          });
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