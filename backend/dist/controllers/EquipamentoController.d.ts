import { Request, Response } from 'express';
export declare const equipamentoValidation: import("express-validator").ValidationChain[];
export declare class EquipamentoController {
    static getAll(req: Request, res: Response): Promise<void>;
    static getById(req: Request, res: Response): Promise<void>;
    static create(req: Request, res: Response): Promise<void>;
    static update(req: Request, res: Response): Promise<void>;
    static delete(req: Request, res: Response): Promise<void>;
    static getBackups(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=EquipamentoController.d.ts.map