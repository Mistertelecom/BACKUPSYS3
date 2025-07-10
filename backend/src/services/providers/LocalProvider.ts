import { IProviderService } from '../ProviderService';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface LocalConfig {
  path: string;
}

export class LocalProvider implements IProviderService {
  private config?: LocalConfig;

  initialize(config: LocalConfig) {
    this.config = config;
    
    // Ensure upload directory exists
    if (!fs.existsSync(config.path)) {
      fs.mkdirSync(config.path, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, equipamentoId: number): Promise<{
    provider_path: string;
    file_size: number;
    checksum: string;
  }> {
    if (!this.config) {
      throw new Error('Local provider not initialized');
    }

    const fileBuffer = fs.readFileSync(file.path);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${equipamentoId}_${timestamp}_${file.originalname}`;
    const filePath = path.join(this.config.path, fileName);

    // Move file to final location
    fs.copyFileSync(file.path, filePath);
    fs.unlinkSync(file.path); // Remove temp file

    return {
      provider_path: fileName,
      file_size: fileBuffer.length,
      checksum
    };
  }

  async downloadFile(provider_path: string): Promise<Buffer> {
    if (!this.config) {
      throw new Error('Local provider not initialized');
    }

    // Se o caminho é absoluto, use-o diretamente; senão, junte com o config.path
    const filePath = path.isAbsolute(provider_path) 
      ? provider_path 
      : path.join(this.config.path, provider_path);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    return fs.readFileSync(filePath);
  }

  async deleteFile(provider_path: string): Promise<void> {
    if (!this.config) {
      throw new Error('Local provider not initialized');
    }

    // Se o caminho é absoluto, use-o diretamente; senão, junte com o config.path
    const filePath = path.isAbsolute(provider_path) 
      ? provider_path 
      : path.join(this.config.path, provider_path);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    try {
      // Test if directory exists and is writable
      const testFile = path.join(this.config.path, 'test.txt');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return true;
    } catch (error) {
      return false;
    }
  }
}