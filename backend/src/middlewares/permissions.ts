import { Request, Response, NextFunction } from 'express';
import { database } from '../database/database';

interface UserRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
    permissions?: string[];
  };
}

export const checkPermission = (requiredPermission: string) => {
  return async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const db = database.getDatabase();
      
      // Buscar permissões do usuário baseado na role
      const sql = `
        SELECT r.permissions, u.is_active
        FROM users u
        LEFT JOIN roles r ON u.role = r.name
        WHERE u.id = ?
      `;
      
      db.get(sql, [req.user.id], (err, row: any) => {
        if (err) {
          console.error('Erro ao verificar permissões:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!row) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        // Verificar se usuário está ativo
        if (!row.is_active) {
          return res.status(403).json({ error: 'Usuário desativado' });
        }
        
        if (!row.permissions) {
          return res.status(403).json({ error: 'Usuário sem permissões' });
        }
        
        try {
          const permissions = JSON.parse(row.permissions);
          req.user.permissions = permissions;
          
          // Verificar se tem a permissão específica ou se é admin
          if (permissions.includes(requiredPermission) || permissions.includes('system.admin')) {
            next();
          } else {
            res.status(403).json({ 
              error: 'Permissão insuficiente',
              required: requiredPermission
            });
          }
        } catch (parseError) {
          console.error('Erro ao parsear permissões:', parseError);
          res.status(500).json({ error: 'Erro interno do servidor' });
        }
      });
    } catch (error) {
      console.error('Erro no middleware de permissões:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

export const requireAdmin = () => {
  return checkPermission('system.admin');
};

export const requireRole = (requiredRole: string) => {
  return (req: UserRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    if (req.user.role === requiredRole || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ 
        error: 'Role insuficiente',
        required: requiredRole,
        current: req.user.role
      });
    }
  };
};

// Middleware para verificar se usuário está ativo
export const checkUserActive = () => {
  return async (req: UserRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const db = database.getDatabase();
      const sql = 'SELECT is_active FROM users WHERE id = ?';
      
      db.get(sql, [req.user.id], (err, row: any) => {
        if (err) {
          console.error('Erro ao verificar status do usuário:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!row) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        if (!row.is_active) {
          return res.status(403).json({ error: 'Usuário desativado' });
        }
        
        next();
      });
    } catch (error) {
      console.error('Erro no middleware de verificação de usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

// Lista de permissões disponíveis
export const PERMISSIONS = {
  // Usuários
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  
  // Equipamentos
  EQUIPAMENTOS_CREATE: 'equipamentos.create',
  EQUIPAMENTOS_READ: 'equipamentos.read',
  EQUIPAMENTOS_UPDATE: 'equipamentos.update',
  EQUIPAMENTOS_DELETE: 'equipamentos.delete',
  
  // Backups
  BACKUPS_CREATE: 'backups.create',
  BACKUPS_READ: 'backups.read',
  BACKUPS_UPDATE: 'backups.update',
  BACKUPS_DELETE: 'backups.delete',
  BACKUPS_DOWNLOAD: 'backups.download',
  
  // Providers
  PROVIDERS_CREATE: 'providers.create',
  PROVIDERS_READ: 'providers.read',
  PROVIDERS_UPDATE: 'providers.update',
  PROVIDERS_DELETE: 'providers.delete',
  
  // Sistema
  SYSTEM_ADMIN: 'system.admin'
};