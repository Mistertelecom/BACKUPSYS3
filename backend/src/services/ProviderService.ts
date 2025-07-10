import { Provider } from '../models/Provider';
import { LocalProvider } from './providers/LocalProvider';
import { S3Provider } from './providers/S3Provider';
import { GCSProvider } from './providers/GCSProvider';

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

  async testProviderConnection(provider: Provider): Promise<boolean> {
    try {
      const providerService = await this.initializeProvider(provider);
      return await providerService.testConnection();
    } catch (error) {
      console.error('Provider connection test failed:', error);
      return false;
    }
  }
}

export const providerService = new ProviderService();