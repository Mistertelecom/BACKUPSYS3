import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/stats', DashboardController.getStats);
router.get('/equipamentos', DashboardController.getEquipamentoStats);

export default router;