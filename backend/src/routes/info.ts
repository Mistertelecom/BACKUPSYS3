import { Router, Request, Response } from 'express';
import { FileTypeDetector, EQUIPMENT_FILE_TYPES } from '../utils/fileTypeDetector';

const router = Router();

// Get supported file types information
router.get('/file-types', (req: Request, res: Response) => {
  try {
    const supportedExtensions = FileTypeDetector.getSupportedExtensions();
    const equipmentTypes = EQUIPMENT_FILE_TYPES;
    
    res.json({
      supportedExtensions,
      equipmentTypes,
      genericExtensions: ['.zip', '.tar.gz', '.bak', '.backup']
    });
  } catch (error) {
    console.error('Erro ao buscar tipos de arquivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get equipment-specific file types
router.get('/file-types/:equipmentType', (req: Request, res: Response) => {
  try {
    const { equipmentType } = req.params;
    const normalizedType = equipmentType.toLowerCase();
    
    // Try to find matching equipment type
    for (const [key, info] of Object.entries(EQUIPMENT_FILE_TYPES)) {
      if (key.toLowerCase() === normalizedType || 
          info.equipment.toLowerCase().includes(normalizedType) ||
          normalizedType.includes(key.toLowerCase())) {
        return res.json(info);
      }
    }
    
    // Return generic info if no specific type found
    res.json({
      equipment: 'Equipamento Genérico',
      description: 'Formatos de backup genéricos aceitos',
      extensions: ['.zip', '.tar.gz', '.bak', '.backup', '.cfg'],
      mimeTypes: ['application/zip', 'application/x-tar', 'application/octet-stream', 'text/plain']
    });
  } catch (error) {
    console.error('Erro ao buscar tipos de arquivo para equipamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Validate file compatibility
router.post('/validate-file', (req: Request, res: Response) => {
  try {
    const { filename, equipmentType } = req.body;
    
    if (!filename || !equipmentType) {
      return res.status(400).json({ 
        error: 'Filename e equipmentType são obrigatórios' 
      });
    }
    
    const isValid = FileTypeDetector.validateFileForEquipment(filename, equipmentType);
    const detectedType = FileTypeDetector.detectEquipmentType(filename);
    const fileTypeInfo = FileTypeDetector.getFileTypeInfo(filename);
    
    res.json({
      isValid,
      detectedType,
      fileTypeInfo,
      filename,
      equipmentType
    });
  } catch (error) {
    console.error('Erro ao validar arquivo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;