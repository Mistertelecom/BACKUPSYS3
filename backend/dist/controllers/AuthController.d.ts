import { Request, Response } from 'express';
export declare const loginValidation: import("express-validator").ValidationChain[];
export declare class AuthController {
    static login(req: Request, res: Response): Promise<void>;
    static validateToken(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AuthController.d.ts.map