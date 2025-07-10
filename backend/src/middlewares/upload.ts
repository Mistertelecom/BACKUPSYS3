import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuração específica para equipamentos de rede
const networkEquipmentExtensions = [
  // Formatos gerais
  '.zip', '.tar.gz', '.bak', '.backup',
  
  // Mikrotik
  '.rsc', '.export', '.backup',
  
  // Ubiquiti
  '.cfg', '.json', '.backup',
  
  // Mimosa
  '.cfg', '.json', '.backup',
  
  // Huawei NE*
  '.cfg', '.dat', '.zip', '.tar', '.xml', '.backup',
  
  // OLT FiberHome
  '.cfg', '.db', '.backup', '.dat', '.xml',
  
  // OLT Parks
  '.cfg', '.backup', '.dat', '.xml'
];

const allowedExtensions = process.env.ALLOWED_EXTENSIONS?.split(',') || networkEquipmentExtensions;
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB default

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    const filename = `${baseName}_${timestamp}${extension}`;
    cb(null, filename);
  }
});

// Mapa de tipos de equipamento para extensões específicas
const equipmentTypeExtensions = {
  'mikrotik': ['.rsc', '.export', '.backup', '.cfg'],
  'ubiquiti': ['.cfg', '.json', '.backup', '.unf'],
  'mimosa': ['.cfg', '.json', '.backup'],
  'huawei': ['.cfg', '.dat', '.zip', '.tar', '.xml', '.backup'],
  'fiberhome': ['.cfg', '.db', '.backup', '.dat', '.xml'],
  'parks': ['.cfg', '.backup', '.dat', '.xml']
};

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const fileName = file.originalname.toLowerCase();
  
  // Verificar se é uma extensão permitida
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
    return;
  }
  
  // Verificar se é um arquivo sem extensão mas com padrão conhecido
  if (!fileExtension) {
    // Arquivos Mikrotik podem não ter extensão
    if (fileName.includes('export') || fileName.includes('backup') || fileName.includes('config')) {
      cb(null, true);
      return;
    }
  }
  
  // Verificar extensões compostas como .tar.gz
  if (fileName.endsWith('.tar.gz') || fileName.endsWith('.tar.bz2')) {
    cb(null, true);
    return;
  }
  
  cb(new Error(`Extensão de arquivo não permitida. Permitidas: ${allowedExtensions.join(', ')}`));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize
  }
});

export const uploadSingle = upload.single('backup');

export const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo: 100MB' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Campo de arquivo inválido' });
    }
  }
  
  if (error.message.includes('Extensão de arquivo não permitida')) {
    return res.status(400).json({ error: error.message });
  }
  
  return res.status(500).json({ error: 'Erro no upload do arquivo' });
};