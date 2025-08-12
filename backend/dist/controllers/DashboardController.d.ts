import { Request, Response } from 'express';
export declare class DashboardController {
    static getStats(req: Request, res: Response): Promise<void>;
    static getEquipamentoStats(req: Request, res: Response): Promise<void>;
    static getProviderHealth(req: Request, res: Response): Promise<void>;
    static getBackupJobsStats(req: Request, res: Response): Promise<void>;
    private static getBackupsByProvider;
    private static getBackupsByStatus;
    private static getJobsByStatus;
    private static getJobsByProvider;
}
//# sourceMappingURL=DashboardController.d.ts.map