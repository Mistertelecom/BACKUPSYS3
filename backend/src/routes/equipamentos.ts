import { Router } from 'express';
import { EquipamentoController, equipamentoValidation } from '../controllers/EquipamentoController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', EquipamentoController.getAll);
router.get('/:id', EquipamentoController.getById);
router.post('/', equipamentoValidation, EquipamentoController.create);
router.put('/:id', equipamentoValidation, EquipamentoController.update);
router.delete('/:id', EquipamentoController.delete);
router.get('/:id/backups', EquipamentoController.getBackups);

export default router;