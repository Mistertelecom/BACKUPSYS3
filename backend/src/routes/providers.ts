import { Router } from 'express';
import { ProviderController, providerValidation } from '../controllers/ProviderController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Provider routes
router.get('/', ProviderController.getAll);
router.get('/active', ProviderController.getActive);
router.get('/:id', ProviderController.getById);
router.post('/', providerValidation, ProviderController.create);
router.put('/:id', providerValidation, ProviderController.update);
router.delete('/:id', ProviderController.delete);
router.post('/:id/toggle', ProviderController.toggleActive);
router.post('/:id/test', ProviderController.testConnection);

export default router;