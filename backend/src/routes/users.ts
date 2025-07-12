import express from 'express';
import { UserController } from '../controllers/UserController';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission, requireAdmin, PERMISSIONS } from '../middlewares/permissions';

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Listar todos os usuários (apenas admins)
router.get('/', requireAdmin(), UserController.getAllUsers);

// Buscar usuário por ID (apenas admins)
router.get('/:id', requireAdmin(), UserController.getUserById);

// Criar novo usuário (apenas admins)
router.post('/', requireAdmin(), UserController.createUser);

// Atualizar usuário (apenas admins)
router.put('/:id', requireAdmin(), UserController.updateUser);

// Deletar usuário (apenas admins)
router.delete('/:id', requireAdmin(), UserController.deleteUser);

// Alternar status do usuário (ativar/desativar) (apenas admins)
router.patch('/:id/toggle-status', requireAdmin(), UserController.toggleUserStatus);

// Listar roles disponíveis (apenas admins)
router.get('/roles/list', requireAdmin(), UserController.getRoles);

export default router;