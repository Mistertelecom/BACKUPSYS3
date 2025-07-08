import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { UserModel } from '../models/User';
import { generateToken } from '../middlewares/auth';

export const loginValidation = [
  body('username').notEmpty().withMessage('Username é obrigatório'),
  body('password').notEmpty().withMessage('Password é obrigatório')
];

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { username, password } = req.body;

      const user = await UserModel.findByUsername(username);
      if (!user) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const isValidPassword = await UserModel.validatePassword(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const token = generateToken(user.id!);

      res.json({
        message: 'Login realizado com sucesso',
        token,
        user: {
          id: user.id,
          username: user.username,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      res.json({
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Erro na validação do token:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}