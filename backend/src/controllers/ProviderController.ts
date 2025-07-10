import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ProviderModel } from '../models/Provider';
import { providerService } from '../services/ProviderService';

export const providerValidation = [
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('type').isIn(['local', 'aws-s3', 'gcs']).withMessage('Tipo de provider inválido'),
  body('config').isObject().withMessage('Configuração deve ser um objeto válido')
];

export class ProviderController {
  static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const providers = await ProviderModel.getAll();
      res.json(providers);
    } catch (error) {
      console.error('Erro ao buscar providers:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const provider = await ProviderModel.getById(parseInt(id));
      
      if (!provider) {
        res.status(404).json({ error: 'Provider não encontrado' });
        return;
      }

      res.json(provider);
    } catch (error) {
      console.error('Erro ao buscar provider:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getActive(req: Request, res: Response): Promise<void> {
    try {
      const providers = await ProviderModel.getActive();
      res.json(providers);
    } catch (error) {
      console.error('Erro ao buscar providers ativos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { name, type, config, is_active } = req.body;

      // Validate config structure based on type
      if (type === 'aws-s3') {
        const requiredFields = ['bucket', 'region', 'accessKeyId', 'secretAccessKey'];
        for (const field of requiredFields) {
          if (!config[field]) {
            res.status(400).json({ error: `Campo ${field} é obrigatório para AWS S3` });
            return;
          }
        }
      } else if (type === 'gcs') {
        const requiredFields = ['bucket', 'projectId'];
        for (const field of requiredFields) {
          if (!config[field]) {
            res.status(400).json({ error: `Campo ${field} é obrigatório para Google Cloud Storage` });
            return;
          }
        }
        if (!config.keyFilename && !config.credentials) {
          res.status(400).json({ error: 'keyFilename ou credentials são obrigatórios para GCS' });
          return;
        }
      }

      const provider = await ProviderModel.create({
        name,
        type,
        config: JSON.stringify(config),
        is_active: is_active || false
      });

      res.status(201).json(provider);
    } catch (error) {
      console.error('Erro ao criar provider:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { name, type, config, is_active } = req.body;

      const provider = await ProviderModel.update(parseInt(id), {
        name,
        type,
        config: config ? JSON.stringify(config) : undefined,
        is_active
      });

      if (!provider) {
        res.status(404).json({ error: 'Provider não encontrado' });
        return;
      }

      res.json(provider);
    } catch (error) {
      console.error('Erro ao atualizar provider:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await ProviderModel.delete(parseInt(id));
      
      if (!deleted) {
        res.status(404).json({ error: 'Provider não encontrado' });
        return;
      }

      res.json({ message: 'Provider deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar provider:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const provider = await ProviderModel.toggleActive(parseInt(id));
      
      if (!provider) {
        res.status(404).json({ error: 'Provider não encontrado' });
        return;
      }

      res.json(provider);
    } catch (error) {
      console.error('Erro ao alterar status do provider:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const provider = await ProviderModel.getById(parseInt(id));
      
      if (!provider) {
        res.status(404).json({ error: 'Provider não encontrado' });
        return;
      }

      const isConnected = await providerService.testProviderConnection(provider);
      
      res.json({ 
        success: isConnected,
        message: isConnected ? 'Conexão bem-sucedida' : 'Falha na conexão'
      });
    } catch (error) {
      console.error('Erro ao testar conexão do provider:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}