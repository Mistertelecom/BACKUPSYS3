import { Router } from 'express';
import { AuthController, loginValidation } from '../controllers/AuthController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.post('/login', loginValidation, AuthController.login);
router.get('/validate', authenticateToken, AuthController.validateToken);

export default router;