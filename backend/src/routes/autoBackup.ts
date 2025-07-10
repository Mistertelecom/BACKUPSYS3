import { Router } from 'express';
import { AutoBackupController } from '../controllers/AutoBackupController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// Testar conectividade SSH de um equipamento
router.post('/test-connectivity/:equipamentoId', AutoBackupController.testConnectivity);

// Testar capacidade de backup automatizado
router.post('/test-backup-capability/:equipamentoId', AutoBackupController.testBackupCapability);

// Executar backup manual via SSH
router.post('/execute/:equipamentoId', AutoBackupController.executeBackup);

// Configurar backup automatizado
router.put('/config/:equipamentoId', AutoBackupController.updateAutoBackupConfig);

// Obter configuração de backup automatizado
router.get('/config/:equipamentoId', AutoBackupController.getAutoBackupConfig);

// Listar equipamentos com backup automatizado habilitado
router.get('/enabled', AutoBackupController.getEnabledAutoBackups);

// Obter scripts disponíveis para backup
router.get('/scripts', AutoBackupController.getAvailableScripts);

// Histórico de execuções de backup automatizado
router.get('/history/:equipamentoId', AutoBackupController.getBackupHistory);

export default router;