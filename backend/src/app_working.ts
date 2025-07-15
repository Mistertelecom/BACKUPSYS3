import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Import routes gradually  
import authRoutes from './routes/auth';
import infoRoutes from './routes/info';

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

// API Routes - gradual activation
app.use('/api/auth', authRoutes);
app.use('/api/info', infoRoutes);

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Y BACK Backend' 
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor Y BACK rodando na porta ${PORT}`);
  console.log(`🌐 API disponível em: http://localhost:${PORT}/api`);
  console.log('✅ Backend básico funcionando');
});

export default app;