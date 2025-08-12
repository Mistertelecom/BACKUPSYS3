import { Router } from 'express';
import { ConfigController } from '../controllers/ConfigController';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Rota de teste sem autenticação
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Config API está funcionando',
    timestamp: new Date().toISOString()
  });
});

// Middleware de autenticação para todas as outras rotas
router.use(authenticateToken);

// Obter configurações GitHub
router.get('/github', ConfigController.getGitHubConfig);

// Obter status completo GitHub
router.get('/github/status', ConfigController.getGitHubStatus);

// Configurar token GitHub
router.post('/github/token', ConfigController.setGitHubToken);

// Configurar repositório GitHub
router.post('/github/repo', ConfigController.setGitHubRepo);

// Testar conexão GitHub
router.post('/github/test', ConfigController.testGitHubConnection);

// Remover token GitHub
router.delete('/github/token', ConfigController.removeGitHubToken);

export default router;