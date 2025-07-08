import { Request, Response } from 'express';
export declare class BackupController {
    static getAll(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static upload(req: Request, res: Response): Promise<void>;
    static download(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static getRecent(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=BackupController.d.ts.map