export interface Backup {
    id?: number;
    equipamento_id: number;
    nome_arquivo: string;
    caminho: string;
    provider_type: string;
    provider_path?: string;
    file_size?: number;
    checksum?: string;
    status: string;
    data_upload?: string;
    sync_status?: string;
    last_sync_date?: string;
    sync_provider_id?: number;
    sync_provider_path?: string;
    sync_error?: string;
}
export declare class BackupModel {
    static getAll(): Promise<Backup[]>;
    static getById(id: number): Promise<Backup | null>;
    static getByEquipamentoId(equipamentoId: number): Promise<Backup[]>;
    static create(backupData: Omit<Backup, 'id' | 'data_upload'>): Promise<Backup>;
    static delete(id: number): Promise<boolean>;
    static getWithEquipamento(): Promise<any[]>;
    static getRecentBackups(limit?: number): Promise<any[]>;
    static getAutomatedBackupHistory(equipamentoId: number, limit?: number): Promise<any[]>;
    static getAllAutomatedBackups(limit?: number): Promise<any[]>;
    static updateSyncStatus(id: number, status: string, providerId: number, syncPath?: string | null, error?: string | null): Promise<boolean>;
}
//# sourceMappingURL=Backup.d.ts.map