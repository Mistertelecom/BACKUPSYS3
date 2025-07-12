import { Provider } from '../models/Provider';
import { LocalProvider } from './providers/LocalProvider';
import { S3Provider } from './providers/S3Provider';
import { GCSProvider } from './providers/GCSProvider';
import { DropboxProvider } from './providers/DropboxProvider';
import { GoogleDriveProvider } from './providers/GoogleDriveProvider';

export interface IProviderService {
  uploadFile(file: Express.Multer.File, equipamentoId: number): Promise<{
    provider_path: string;
    file_size: number;
    checksum: string;
  }>;
  downloadFile(provider_path: string): Promise<Buffer>;
  deleteFile(provider_path: string): Promise<void>;
  testConnection(): Promise<boolean>;
}

export class ProviderService {
  private providers: Map<string, IProviderService> = new Map();

  constructor() {
    this.providers.set('local', new LocalProvider());
    this.providers.set('aws-s3', new S3Provider());
    this.providers.set('gcs', new GCSProvider());
  }

  getProvider(type: string): IProviderService | undefined {
    return this.providers.get(type);
  }

  async initializeProvider(provider: Provider): Promise<IProviderService> {
    const providerService = this.getProvider(provider.type);
    if (!providerService) {
      throw new Error(`Provider type ${provider.type} not supported`);
    }

    const config = JSON.parse(provider.config);
    
    switch (provider.type) {
      case 'local':
        (providerService as LocalProvider).initialize(config);
        break;
      case 'aws-s3':
        (providerService as S3Provider).initialize(config);
        break;
      case 'gcs':
        (providerService as GCSProvider).initialize(config);
        break;
    }

    return providerService;
  }

  async testProviderConnection(provider: Provider): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log(`🔧 Inicializando teste para provider tipo: ${provider.type}`);
      const config = JSON.parse(provider.config);
      
      // Para Dropbox e Google Drive, usar os novos providers diretamente
      if (provider.type === 'dropbox') {
        const dropboxProvider = new DropboxProvider(config);
        const result = await dropboxProvider.testConnection();
        return {
          success: result.success,
          error: result.error,
          details: result.accountInfo
        };
      }
      
      if (provider.type === 'google-drive') {
        const googleDriveProvider = new GoogleDriveProvider(config);
        const result = await googleDriveProvider.testConnection();
        return {
          success: result.success,
          error: result.error,
          details: result.userInfo
        };
      }
      
      // Para providers legados (local, aws-s3, gcs)
      const providerService = await this.initializeProvider(provider);
      const isConnected = await providerService.testConnection();
      return {
        success: isConnected,
        error: isConnected ? undefined : 'Falha na conexão'
      };
    } catch (error) {
      console.error('❌ Provider connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: error
      };
    }
  }
}

export const providerService = new ProviderService();