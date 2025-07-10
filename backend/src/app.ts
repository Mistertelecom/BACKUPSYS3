import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import equipamentoRoutes from './routes/equipamentos';
import backupRoutes from './routes/backups';
import dashboardRoutes from './routes/dashboard';
import providerRoutes from './routes/providers';
import backupJobRoutes from './routes/backupJobs';
import infoRoutes from './routes/info';
import autoBackupRoutes from './routes/autoBackup';
import { schedulerService } from './services/SchedulerService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

app.use('/api/auth', authRoutes);
app.use('/api/equipamentos', equipamentoRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/backup-jobs', backupJobRoutes);
app.use('/api/info', infoRoutes);
app.use('/api/auto-backup', autoBackupRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Y BACK API is running',
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Rota não encontrada' });
  } else {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  }
});

app.use((err: any, req: any, res: any, next: any) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, async () => {
  console.log(`🚀 Servidor Y BACK rodando na porta ${PORT}`);
  console.log(`🌐 API disponível em: http://localhost:${PORT}/api`);
  
  // Initialize scheduler service
  try {
    await schedulerService.initialize();
  } catch (error) {
    console.error('Erro ao inicializar scheduler:', error);
  }
});

export default app;