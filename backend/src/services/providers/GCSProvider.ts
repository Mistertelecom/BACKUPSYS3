import { IProviderService } from '../ProviderService';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import crypto from 'crypto';

export interface GCSConfig {
  bucket: string;
  projectId: string;
  keyFilename?: string;
  credentials?: object;
}

export class GCSProvider implements IProviderService {
  private storage?: Storage;
  private bucket?: any;
  private config?: GCSConfig;

  initialize(config: GCSConfig) {
    // Validate required configuration
    if (!config.bucket || !config.projectId) {
      throw new Error('GCS configuration is missing required fields: bucket or projectId');
    }

    if (!config.keyFilename && !config.credentials) {
      throw new Error('GCS configuration requires either keyFilename or credentials');
    }

    this.config = config;
    
    const storageConfig: any = {
      projectId: config.projectId
    };

    if (config.keyFilename) {
      storageConfig.keyFilename = config.keyFilename;
    } else if (config.credentials) {
      storageConfig.credentials = config.credentials;
    }

    this.storage = new Storage(storageConfig);
    this.bucket = this.storage.bucket(config.bucket);
  }

  async uploadFile(file: Express.Multer.File, equipamentoId: number): Promise<{
    provider_path: string;
    file_size: number;
    checksum: string;
  }> {
    if (!this.storage || !this.bucket || !this.config) {
      throw new Error('GCS provider not initialized');
    }

    const fileBuffer = fs.readFileSync(file.path);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backups/${equipamentoId}/${timestamp}_${file.originalname}`;

    const gcsFile = this.bucket.file(fileName);

    try {
      await gcsFile.save(fileBuffer, {
        metadata: {
          contentType: file.mimetype,
          metadata: {
            'original-name': file.originalname,
            'equipamento-id': equipamentoId.toString(),
            'upload-timestamp': timestamp
          }
        }
      });

      // Clean up temp file
      fs.unlinkSync(file.path);

      return {
        provider_path: fileName,
        file_size: fileBuffer.length,
        checksum
      };
    } catch (error) {
      // Clean up temp file on error
      fs.unlinkSync(file.path);
      throw error;
    }
  }

  async downloadFile(provider_path: string): Promise<Buffer> {
    if (!this.storage || !this.bucket || !this.config) {
      throw new Error('GCS provider not initialized');
    }

    const gcsFile = this.bucket.file(provider_path);

    try {
      const [exists] = await gcsFile.exists();
      if (!exists) {
        throw new Error('File not found');
      }

      const [buffer] = await gcsFile.download();
      return buffer;
    } catch (error) {
      if ((error as any).code === 404) {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  async deleteFile(provider_path: string): Promise<void> {
    if (!this.storage || !this.bucket || !this.config) {
      throw new Error('GCS provider not initialized');
    }

    const gcsFile = this.bucket.file(provider_path);

    try {
      await gcsFile.delete();
    } catch (error) {
      console.error('Error deleting file from GCS:', error);
      // Don't throw error if file doesn't exist
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.storage || !this.bucket || !this.config) {
      return false;
    }

    try {
      // Test by checking if bucket exists
      const [exists] = await this.bucket.exists();
      return exists;
    } catch (error) {
      console.error('GCS connection test failed:', error);
      return false;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    if (!this.storage || !this.bucket || !this.config) {
      throw new Error('GCS provider not initialized');
    }

    try {
      const [files] = await this.bucket.getFiles({
        prefix: prefix || 'backups/'
      });

      return files.map((file: any) => file.name);
    } catch (error) {
      console.error('Error listing GCS files:', error);
      return [];
    }
  }
}