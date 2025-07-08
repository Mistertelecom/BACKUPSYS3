import { Router } from 'express';
import { BackupController } from '../controllers/BackupController';
import { authenticateToken } from '../middlewares/auth';
import { uploadSingle, handleUploadError } from '../middlewares/upload';

const router = Router();

router.use(authenticateToken);

router.get('/', BackupController.getAll);
router.get('/recent', BackupController.getRecent);
router.get('/:id', BackupController.getById);
router.post('/equipamento/:equipamentoId', uploadSingle, handleUploadError, BackupController.upload);
router.get('/:id/download', BackupController.download);
router.delete('/:id', BackupController.delete);

export default router;