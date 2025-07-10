import { IProviderService } from '../ProviderService';
import { S3, config as AWSConfig, AWSError } from 'aws-sdk';
import fs from 'fs';
import crypto from 'crypto';

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export class S3Provider implements IProviderService {
  private s3?: S3;
  private config?: S3Config;

  initialize(config: S3Config) {
    // Validate required configuration
    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      throw new Error('S3 configuration is missing required fields: bucket, accessKeyId, or secretAccessKey');
    }

    this.config = config;
    
    AWSConfig.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region || 'us-east-1'
    });

    this.s3 = new S3({
      endpoint: config.endpoint,
      s3ForcePathStyle: !!config.endpoint
    });
  }

  async uploadFile(file: Express.Multer.File, equipamentoId: number): Promise<{
    provider_path: string;
    file_size: number;
    checksum: string;
  }> {
    if (!this.s3 || !this.config) {
      throw new Error('S3 provider not initialized');
    }

    const fileBuffer = fs.readFileSync(file.path);
    const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backups/${equipamentoId}/${timestamp}_${file.originalname}`;

    const params = {
      Bucket: this.config.bucket,
      Key: fileName,
      Body: fileBuffer,
      ContentType: file.mimetype,
      Metadata: {
        'original-name': file.originalname,
        'equipamento-id': equipamentoId.toString(),
        'upload-timestamp': timestamp
      }
    };

    try {
      const result = await this.s3.upload(params).promise();
      
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
    if (!this.s3 || !this.config) {
      throw new Error('S3 provider not initialized');
    }

    const params = {
      Bucket: this.config.bucket,
      Key: provider_path
    };

    try {
      const result = await this.s3.getObject(params).promise();
      return result.Body as Buffer;
    } catch (error) {
      if ((error as AWSError).code === 'NoSuchKey') {
        throw new Error('File not found');
      }
      throw error;
    }
  }

  async deleteFile(provider_path: string): Promise<void> {
    if (!this.s3 || !this.config) {
      throw new Error('S3 provider not initialized');
    }

    const params = {
      Bucket: this.config.bucket,
      Key: provider_path
    };

    try {
      await this.s3.deleteObject(params).promise();
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      // Don't throw error if file doesn't exist
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.s3 || !this.config) {
      return false;
    }

    try {
      // Test by listing objects in bucket
      await this.s3.listObjects({
        Bucket: this.config.bucket,
        MaxKeys: 1
      }).promise();
      
      return true;
    } catch (error) {
      console.error('S3 connection test failed:', error);
      return false;
    }
  }

  async listFiles(prefix?: string): Promise<string[]> {
    if (!this.s3 || !this.config) {
      throw new Error('S3 provider not initialized');
    }

    const params = {
      Bucket: this.config.bucket,
      Prefix: prefix || 'backups/'
    };

    try {
      const result = await this.s3.listObjects(params).promise();
      return result.Contents?.map(obj => obj.Key!).filter(key => key) || [];
    } catch (error) {
      console.error('Error listing S3 files:', error);
      return [];
    }
  }
}