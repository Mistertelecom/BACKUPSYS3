import { Router } from 'express';
import { UpdateController } from '../controllers/UpdateController';

const router = Router();

// Obter informações gerais de atualizações (para a página principal)
router.get('/', UpdateController.getUpdatesInfo);

// Verificar atualizações disponíveis
router.get('/check', UpdateController.checkUpdates);

// Rotas específicas do GitHub
router.get('/github/check', UpdateController.checkUpdates);
router.get('/github/system-info', UpdateController.getSystemStatus);

// Obter status do sistema
router.get('/system/status', UpdateController.getSystemStatus);

// Listar releases disponíveis
router.get('/releases', UpdateController.listReleases);

// Obter informações de uma release específica
router.get('/releases/:version', UpdateController.getReleaseInfo);

// Criar backup manual
router.post('/backup', UpdateController.createBackup);

// Listar backups disponíveis
router.get('/backups', UpdateController.listBackups);

// Validar segurança de uma atualização
router.post('/validate', UpdateController.validateUpdate);

// Executar atualização (requer confirmação)
router.post('/update', UpdateController.performUpdate);

export default router;