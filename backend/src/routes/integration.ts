import { Router } from 'express';
import { IntegrationController } from '../controllers/IntegrationController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

router.get('/vps-info', IntegrationController.getVPSInfo);
router.post('/generate-config', IntegrationController.generateConfig);
router.post('/test-connectivity', IntegrationController.testConnectivity);

export default router;