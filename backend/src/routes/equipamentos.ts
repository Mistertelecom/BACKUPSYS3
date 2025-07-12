import { Router } from 'express';
import { EquipamentoController, equipamentoValidation } from '../controllers/EquipamentoController';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission, checkUserActive, PERMISSIONS } from '../middlewares/permissions';

const router = Router();

router.use(authenticateToken);
router.use(checkUserActive());

router.get('/', checkPermission(PERMISSIONS.EQUIPAMENTOS_READ), EquipamentoController.getAll);
router.get('/:id', checkPermission(PERMISSIONS.EQUIPAMENTOS_READ), EquipamentoController.getById);
router.post('/', checkPermission(PERMISSIONS.EQUIPAMENTOS_CREATE), equipamentoValidation, EquipamentoController.create);
router.put('/:id', checkPermission(PERMISSIONS.EQUIPAMENTOS_UPDATE), equipamentoValidation, EquipamentoController.update);
router.delete('/:id', checkPermission(PERMISSIONS.EQUIPAMENTOS_DELETE), EquipamentoController.delete);
router.get('/:id/backups', checkPermission(PERMISSIONS.BACKUPS_READ), EquipamentoController.getBackups);

export default router;