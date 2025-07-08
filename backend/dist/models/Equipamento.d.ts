export interface Equipamento {
    id?: number;
    nome: string;
    ip: string;
    tipo: string;
    created_at?: string;
}
export declare class EquipamentoModel {
    static getAll(): Promise<Equipamento[]>;
    static getById(id: number): Promise<Equipamento | null>;
    static create(equipamentoData: Omit<Equipamento, 'id' | 'created_at'>): Promise<Equipamento>;
    static update(id: number, equipamentoData: Partial<Omit<Equipamento, 'id' | 'created_at'>>): Promise<Equipamento | null>;
    static delete(id: number): Promise<boolean>;
    static getWithBackupCount(): Promise<any[]>;
}
//# sourceMappingURL=Equipamento.d.ts.map