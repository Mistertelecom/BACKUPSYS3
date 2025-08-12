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
export declare class EquipamentoModel {
    static getAll(): Promise<Equipamento[]>;
    static getById(id: number): Promise<Equipamento | null>;
    static create(equipamentoData: Omit<Equipamento, 'id' | 'created_at'>): Promise<Equipamento>;
    static update(id: number, equipamentoData: Partial<Omit<Equipamento, 'id' | 'created_at'>>): Promise<Equipamento | null>;
    static delete(id: number): Promise<boolean>;
    static getWithBackupCount(): Promise<any[]>;
    static updateSSHConfig(id: number, sshConfig: SSHConfigData): Promise<boolean>;
    static getWithAutoBackupEnabled(): Promise<Equipamento[]>;
    static getSSHEnabled(): Promise<Equipamento[]>;
    static getAutoBackupEnabled(): Promise<Equipamento[]>;
}
//# sourceMappingURL=Equipamento.d.ts.map