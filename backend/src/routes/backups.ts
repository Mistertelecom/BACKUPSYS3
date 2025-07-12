import { Router } from 'express';
import { BackupController } from '../controllers/BackupController';
import { authenticateToken } from '../middlewares/auth';
import { uploadSingle, handleUploadError } from '../middlewares/upload';
import { checkPermission, checkUserActive, PERMISSIONS } from '../middlewares/permissions';

const router = Router();

router.use(authenticateToken);
router.use(checkUserActive());

router.get('/', checkPermission(PERMISSIONS.BACKUPS_READ), BackupController.getAll);
router.get('/recent', checkPermission(PERMISSIONS.BACKUPS_READ), BackupController.getRecent);
router.get('/:id', checkPermission(PERMISSIONS.BACKUPS_READ), BackupController.getById);
router.post('/equipamento/:equipamentoId', checkPermission(PERMISSIONS.BACKUPS_CREATE), uploadSingle, handleUploadError, BackupController.upload);
router.get('/:id/download', checkPermission(PERMISSIONS.BACKUPS_DOWNLOAD), BackupController.download);
router.post('/:id/sync', checkPermission(PERMISSIONS.BACKUPS_UPDATE), BackupController.syncToCloud);
router.delete('/:id', checkPermission(PERMISSIONS.BACKUPS_DELETE), BackupController.delete);

export default router;