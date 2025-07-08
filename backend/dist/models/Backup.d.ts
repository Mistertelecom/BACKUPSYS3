export interface Backup {
    id?: number;
    equipamento_id: number;
    nome_arquivo: string;
    caminho: string;
    data_upload?: string;
}
export declare class BackupModel {
    static getAll(): Promise<Backup[]>;
    static getById(id: number): Promise<Backup | null>;
    static getByEquipamentoId(equipamentoId: number): Promise<Backup[]>;
    static create(backupData: Omit<Backup, 'id' | 'data_upload'>): Promise<Backup>;
    static delete(id: number): Promise<boolean>;
    static getWithEquipamento(): Promise<any[]>;
    static getRecentBackups(limit?: number): Promise<any[]>;
}
//# sourceMappingURL=Backup.d.ts.map