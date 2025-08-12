"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = exports.Database = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const DATABASE_PATH = process.env.DATABASE_PATH || './database.sqlite';
class Database {
    constructor() {
        try {
            this.db = new sqlite3_1.default.Database(DATABASE_PATH, (err) => {
                if (err) {
                    console.error('Erro ao conectar com o banco de dados:', err);
                    process.exit(1);
                }
                else {
                    console.log('Conectado ao banco SQLite');
                    this.initTables();
                }
            });
        }
        catch (constructorErr) {
            console.error('Erro no constructor do banco:', constructorErr);
            process.exit(1);
        }
    }
    initTables() {
        const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'readonly',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
      )
    `;
        const createRolesTable = `
      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        permissions TEXT NOT NULL,
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
            this.db.run(createRolesTable);
            this.db.run(createEquipamentosTable);
            this.db.run(createProvidersTable);
            this.db.run(createBackupsTable);
            this.db.run(createBackupJobsTable);
            this.db.run(createBackupHistoryTable);
            this.runMigrations();
            this.createDefaultRoles();
            this.createDefaultUser();
            this.createDefaultProviders();
        });
    }
    runMigrations() {
        const userColumns = [
            'ALTER TABLE users ADD COLUMN role TEXT DEFAULT "readonly"',
            'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1',
            'ALTER TABLE users ADD COLUMN updated_at DATETIME'
        ];
        userColumns.forEach(sql => {
            this.db.run(sql, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Erro ao adicionar coluna user:', err);
                }
            });
        });
        this.db.run(`ALTER TABLE backups ADD COLUMN metadata TEXT`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Erro ao adicionar coluna metadata:', err);
            }
        });
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
        const syncColumns = [
            'ALTER TABLE backups ADD COLUMN sync_status TEXT DEFAULT "not_synced"',
            'ALTER TABLE backups ADD COLUMN last_sync_date DATETIME',
            'ALTER TABLE backups ADD COLUMN sync_provider_id INTEGER',
            'ALTER TABLE backups ADD COLUMN sync_provider_path TEXT',
            'ALTER TABLE backups ADD COLUMN sync_error TEXT'
        ];
        syncColumns.forEach(sql => {
            this.db.run(sql, (err) => {
                if (err && !err.message.includes('duplicate column name')) {
                    console.error('Erro ao adicionar coluna de sincronização:', err);
                }
            });
        });
    }
    createDefaultRoles() {
        const checkRoles = `SELECT COUNT(*) as count FROM roles`;
        this.db.get(checkRoles, [], (err, row) => {
            if (err) {
                console.error('Erro ao verificar roles:', err);
                return;
            }
            if (row.count === 0) {
                const defaultRoles = [
                    {
                        name: 'admin',
                        description: 'Administrador com acesso total ao sistema',
                        permissions: JSON.stringify([
                            'users.create', 'users.read', 'users.update', 'users.delete',
                            'equipamentos.create', 'equipamentos.read', 'equipamentos.update', 'equipamentos.delete',
                            'backups.create', 'backups.read', 'backups.update', 'backups.delete', 'backups.download',
                            'providers.create', 'providers.read', 'providers.update', 'providers.delete',
                            'system.admin'
                        ])
                    },
                    {
                        name: 'readonly',
                        description: 'Usuário com permissões somente de leitura',
                        permissions: JSON.stringify([
                            'equipamentos.read',
                            'backups.read'
                        ])
                    },
                    {
                        name: 'download',
                        description: 'Usuário com permissões de leitura e download',
                        permissions: JSON.stringify([
                            'equipamentos.read',
                            'backups.read',
                            'backups.download'
                        ])
                    }
                ];
                const insertRole = `INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)`;
                defaultRoles.forEach(role => {
                    this.db.run(insertRole, [role.name, role.description, role.permissions], (err) => {
                        if (err) {
                            console.error('Erro ao criar role padrão:', err);
                        }
                        else {
                            console.log(`Role ${role.name} criada`);
                        }
                    });
                });
            }
        });
    }
    createDefaultUser() {
        const checkUser = `SELECT COUNT(*) as count FROM users WHERE username = ?`;
        this.db.get(checkUser, ['admin'], (err, row) => {
            if (err) {
                console.error('Erro ao verificar usuário:', err);
                return;
            }
            if (row.count === 0) {
                const hashedPassword = bcryptjs_1.default.hashSync('admin123', 10);
                const insertUser = `INSERT INTO users (username, password, role, is_active) VALUES (?, ?, ?, ?)`;
                this.db.run(insertUser, ['admin', hashedPassword, 'admin', 1], (err) => {
                    if (err) {
                        console.error('Erro ao criar usuário padrão:', err);
                    }
                    else {
                        console.log('Usuário padrão criado: admin / admin123 (role: admin)');
                    }
                });
            }
            else {
                const updateUser = `UPDATE users SET role = 'admin' WHERE username = 'admin' AND (role IS NULL OR role = '')`;
                this.db.run(updateUser, [], (err) => {
                    if (err) {
                        console.error('Erro ao atualizar role do usuário admin:', err);
                    }
                });
            }
        });
    }
    createDefaultProviders() {
        const checkProviders = `SELECT COUNT(*) as count FROM providers`;
        this.db.get(checkProviders, [], (err, row) => {
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
                    },
                    {
                        name: 'Dropbox',
                        type: 'dropbox',
                        config: JSON.stringify({
                            accessToken: '',
                            refreshToken: '',
                            appKey: '',
                            appSecret: '',
                            folderPath: '/backups'
                        })
                    },
                    {
                        name: 'Google Drive',
                        type: 'google-drive',
                        config: JSON.stringify({
                            clientId: '',
                            clientSecret: '',
                            refreshToken: '',
                            accessToken: '',
                            folderId: '',
                            folderName: 'Backups Y BACK'
                        })
                    }
                ];
                const insertProvider = `INSERT INTO providers (name, type, config, is_active) VALUES (?, ?, ?, ?)`;
                defaultProviders.forEach((provider, index) => {
                    const isActive = index === 0 ? 1 : 0;
                    this.db.run(insertProvider, [provider.name, provider.type, provider.config, isActive], (err) => {
                        if (err) {
                            console.error('Erro ao criar provider padrão:', err);
                        }
                        else {
                            console.log(`Provider ${provider.name} criado`);
                        }
                    });
                });
            }
        });
    }
    getDatabase() {
        return this.db;
    }
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Erro ao fechar banco de dados:', err);
            }
            else {
                console.log('Conexão com banco de dados fechada');
            }
        });
    }
}
exports.Database = Database;
exports.database = new Database();
//# sourceMappingURL=database.js.map