import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();

/**
 * GET /api/updates
 * Retorna informações de versão e changelog do sistema
 */
router.get('/', async (req, res) => {
  try {
    const updatesPath = path.join(__dirname, '../../data/updates.json');
    
    // Verificar se o arquivo existe
    try {
      await fs.access(updatesPath);
    } catch {
      // Se o arquivo não existir, criar um padrão
      const defaultData = {
        version: '1.0.0',
        build: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
        releaseDate: new Date().toISOString().split('T')[0],
        changelog: [],
        roadmap: [],
        systemInfo: {
          name: 'Y BACK',
          description: 'Sistema de Backup Empresarial',
          author: 'Sua Empresa',
          license: 'Proprietário'
        }
      };
      
      await fs.writeFile(updatesPath, JSON.stringify(defaultData, null, 2));
      return res.json(defaultData);
    }
    
    const data = await fs.readFile(updatesPath, 'utf8');
    const updates = JSON.parse(data);
    
    res.json(updates);
  } catch (error) {
    console.error('Erro ao ler informações de atualizações:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar as informações de atualizações'
    });
  }
});

/**
 * GET /api/updates/version
 * Retorna apenas informações básicas de versão
 */
router.get('/version', async (req, res) => {
  try {
    const updatesPath = path.join(__dirname, '../../data/updates.json');
    const data = await fs.readFile(updatesPath, 'utf8');
    const updates = JSON.parse(data);
    
    res.json({
      version: updates.version,
      build: updates.build,
      releaseDate: updates.releaseDate,
      name: updates.systemInfo?.name || 'Y BACK'
    });
  } catch (error) {
    console.error('Erro ao ler informações de versão:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: 'Não foi possível carregar as informações de versão'
    });
  }
});

export default router;