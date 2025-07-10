import { Router } from 'express';
import { BackupJobController, backupJobValidation } from '../controllers/BackupJobController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Backup job routes
router.get('/', BackupJobController.getAll);
router.get('/stats', BackupJobController.getSchedulerStats);
router.get('/equipamento/:equipamentoId', BackupJobController.getByEquipamentoId);
router.get('/:id', BackupJobController.getById);
router.post('/', backupJobValidation, BackupJobController.create);
router.put('/:id', backupJobValidation, BackupJobController.update);
router.delete('/:id', BackupJobController.delete);
router.post('/:id/pause', BackupJobController.pause);
router.post('/:id/resume', BackupJobController.resume);
router.post('/:id/run', BackupJobController.runNow);
router.post('/validate-cron', BackupJobController.validateCronPattern);

export default router;