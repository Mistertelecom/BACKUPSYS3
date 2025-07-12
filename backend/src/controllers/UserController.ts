import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { database } from '../database/database';

interface UserRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  };
}

export class UserController {
  static async getAllUsers(req: UserRequest, res: Response) {
    try {
      const db = database.getDatabase();
      
      const sql = `
        SELECT 
          u.id, 
          u.username, 
          u.role, 
          u.is_active, 
          u.created_at, 
          u.updated_at,
          r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role = r.name
        ORDER BY u.created_at DESC
      `;
      
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Erro ao buscar usuários:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        res.json(rows);
      });
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getUserById(req: UserRequest, res: Response) {
    try {
      const { id } = req.params;
      const db = database.getDatabase();
      
      const sql = `
        SELECT 
          u.id, 
          u.username, 
          u.role, 
          u.is_active, 
          u.created_at, 
          u.updated_at,
          r.description as role_description,
          r.permissions
        FROM users u
        LEFT JOIN roles r ON u.role = r.name
        WHERE u.id = ?
      `;
      
      db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('Erro ao buscar usuário:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!row) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json(row);
      });
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async createUser(req: UserRequest, res: Response) {
    try {
      const { username, password, role = 'readonly' } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username e password são obrigatórios' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password deve ter pelo menos 6 caracteres' });
      }

      const validRoles = ['admin', 'readonly', 'download'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Role inválida' });
      }
      
      const db = database.getDatabase();
      
      // Verificar se usuário já existe
      const checkSql = 'SELECT id FROM users WHERE username = ?';
      db.get(checkSql, [username], (err, existingUser) => {
        if (err) {
          console.error('Erro ao verificar usuário:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (existingUser) {
          return res.status(409).json({ error: 'Username já existe' });
        }
        
        // Criar novo usuário
        const hashedPassword = bcrypt.hashSync(password, 10);
        const insertSql = `
          INSERT INTO users (username, password, role, is_active, updated_at) 
          VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        `;
        
        db.run(insertSql, [username, hashedPassword, role], function(err) {
          if (err) {
            console.error('Erro ao criar usuário:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }
          
          // Buscar usuário criado com informações da role
          const getUserSql = `
            SELECT 
              u.id, 
              u.username, 
              u.role, 
              u.is_active, 
              u.created_at,
              r.description as role_description
            FROM users u
            LEFT JOIN roles r ON u.role = r.name
            WHERE u.id = ?
          `;
          
          db.get(getUserSql, [this.lastID], (err, newUser) => {
            if (err) {
              console.error('Erro ao buscar usuário criado:', err);
              return res.status(500).json({ error: 'Usuário criado mas erro ao retornar dados' });
            }
            
            res.status(201).json({
              message: 'Usuário criado com sucesso',
              user: newUser
            });
          });
        });
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async updateUser(req: UserRequest, res: Response) {
    try {
      const { id } = req.params;
      const { username, password, role, is_active } = req.body;
      
      const db = database.getDatabase();
      
      // Verificar se usuário existe
      const checkSql = 'SELECT id, username FROM users WHERE id = ?';
      db.get(checkSql, [id], (err, existingUser: any) => {
        if (err) {
          console.error('Erro ao verificar usuário:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!existingUser) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        // Não permitir que o admin altere seu próprio role ou status
        if (existingUser.username === 'admin' && req.user?.username === 'admin') {
          if (role && role !== 'admin') {
            return res.status(403).json({ error: 'Não é possível alterar role do usuário admin' });
          }
          if (is_active === false || is_active === 0) {
            return res.status(403).json({ error: 'Não é possível desativar o usuário admin' });
          }
        }
        
        // Verificar se username já existe (se estiver sendo alterado)
        if (username && username !== existingUser.username) {
          const checkUsernameSql = 'SELECT id FROM users WHERE username = ? AND id != ?';
          db.get(checkUsernameSql, [username, id], (err, duplicateUser) => {
            if (err) {
              console.error('Erro ao verificar username:', err);
              return res.status(500).json({ error: 'Erro interno do servidor' });
            }
            
            if (duplicateUser) {
              return res.status(409).json({ error: 'Username já existe' });
            }
            
            updateUserData();
          });
        } else {
          updateUserData();
        }
        
        function updateUserData() {
          const updates = [];
          const values = [];
          
          if (username) {
            updates.push('username = ?');
            values.push(username);
          }
          
          if (password) {
            if (password.length < 6) {
              return res.status(400).json({ error: 'Password deve ter pelo menos 6 caracteres' });
            }
            updates.push('password = ?');
            values.push(bcrypt.hashSync(password, 10));
          }
          
          if (role) {
            const validRoles = ['admin', 'readonly', 'download'];
            if (!validRoles.includes(role)) {
              return res.status(400).json({ error: 'Role inválida' });
            }
            updates.push('role = ?');
            values.push(role);
          }
          
          if (is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(is_active ? 1 : 0);
          }
          
          if (updates.length === 0) {
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
          }
          
          updates.push('updated_at = CURRENT_TIMESTAMP');
          values.push(id);
          
          const updateSql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
          
          db.run(updateSql, values, function(err) {
            if (err) {
              console.error('Erro ao atualizar usuário:', err);
              return res.status(500).json({ error: 'Erro interno do servidor' });
            }
            
            // Buscar usuário atualizado
            const getUserSql = `
              SELECT 
                u.id, 
                u.username, 
                u.role, 
                u.is_active, 
                u.created_at, 
                u.updated_at,
                r.description as role_description
              FROM users u
              LEFT JOIN roles r ON u.role = r.name
              WHERE u.id = ?
            `;
            
            db.get(getUserSql, [id], (err, updatedUser) => {
              if (err) {
                console.error('Erro ao buscar usuário atualizado:', err);
                return res.status(500).json({ error: 'Usuário atualizado mas erro ao retornar dados' });
              }
              
              res.json({
                message: 'Usuário atualizado com sucesso',
                user: updatedUser
              });
            });
          });
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async deleteUser(req: UserRequest, res: Response) {
    try {
      const { id } = req.params;
      const db = database.getDatabase();
      
      // Verificar se usuário existe
      const checkSql = 'SELECT username FROM users WHERE id = ?';
      db.get(checkSql, [id], (err, user: any) => {
        if (err) {
          console.error('Erro ao verificar usuário:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!user) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        // Não permitir deletar o usuário admin
        if (user.username === 'admin') {
          return res.status(403).json({ error: 'Não é possível deletar o usuário admin' });
        }
        
        // Deletar usuário
        const deleteSql = 'DELETE FROM users WHERE id = ?';
        db.run(deleteSql, [id], function(err) {
          if (err) {
            console.error('Erro ao deletar usuário:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }
          
          res.json({ message: 'Usuário deletado com sucesso' });
        });
      });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getRoles(req: Request, res: Response) {
    try {
      const db = database.getDatabase();
      
      const sql = 'SELECT * FROM roles ORDER BY name';
      
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Erro ao buscar roles:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        // Parse permissions JSON
        const roles = rows.map((row: any) => ({
          ...row,
          permissions: JSON.parse(row.permissions)
        }));
        
        res.json(roles);
      });
    } catch (error) {
      console.error('Erro ao buscar roles:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async toggleUserStatus(req: UserRequest, res: Response) {
    try {
      const { id } = req.params;
      const db = database.getDatabase();
      
      // Verificar se usuário existe
      const checkSql = 'SELECT username, is_active FROM users WHERE id = ?';
      db.get(checkSql, [id], (err, user: any) => {
        if (err) {
          console.error('Erro ao verificar usuário:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!user) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        // Não permitir desativar o usuário admin
        if (user.username === 'admin' && user.is_active) {
          return res.status(403).json({ error: 'Não é possível desativar o usuário admin' });
        }
        
        const newStatus = user.is_active ? 0 : 1;
        const updateSql = 'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        
        db.run(updateSql, [newStatus, id], function(err) {
          if (err) {
            console.error('Erro ao alterar status do usuário:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
          }
          
          res.json({ 
            message: `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso`,
            is_active: newStatus
          });
        });
      });
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}