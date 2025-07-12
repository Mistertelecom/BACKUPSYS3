import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  accessToken?: string;
  folderId?: string;
  folderName?: string;
}

export interface GoogleDriveUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  size?: number;
  webViewLink?: string;
  error?: string;
}

export interface GoogleDriveTestResult {
  success: boolean;
  userInfo?: any;
  error?: string;
}

export class GoogleDriveProvider {
  private config: GoogleDriveConfig;
  private apiUrl = 'https://www.googleapis.com';
  private uploadUrl = 'https://www.googleapis.com/upload/drive/v3';

  constructor(config: GoogleDriveConfig) {
    this.config = config;
  }

  /**
   * Testa conectividade com o Google Drive
   */
  async testConnection(): Promise<GoogleDriveTestResult> {
    try {
      // Verificar se o token está válido
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'Não foi possível obter access token válido'
        };
      }

      // Obter informações do usuário
      const response = await axios.get(
        `${this.apiUrl}/drive/v3/about?fields=user`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return {
        success: true,
        userInfo: {
          name: response.data.user?.displayName,
          email: response.data.user?.emailAddress,
          photoLink: response.data.user?.photoLink
        }
      };
    } catch (error: any) {
      console.error('Erro ao testar conexão Google Drive:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Faz upload de um arquivo para o Google Drive
   */
  async uploadFile(localFilePath: string, fileName: string): Promise<GoogleDriveUploadResult> {
    try {
      if (!fs.existsSync(localFilePath)) {
        return {
          success: false,
          error: 'Arquivo não encontrado'
        };
      }

      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'Não foi possível obter access token válido'
        };
      }

      // Verificar/criar pasta de backup
      const folderId = await this.ensureBackupFolder(accessToken);
      if (!folderId) {
        return {
          success: false,
          error: 'Não foi possível criar/encontrar pasta de backup'
        };
      }

      const fileStats = fs.statSync(localFilePath);
      const fileContent = fs.readFileSync(localFilePath);

      // Metadados do arquivo
      const metadata = {
        name: fileName,
        parents: [folderId]
      };

      // Upload simples para arquivos pequenos (< 5MB)
      if (fileStats.size < 5 * 1024 * 1024) {
        return await this.simpleUpload(accessToken, metadata, fileContent);
      } else {
        // Upload resumível para arquivos grandes
        return await this.resumableUpload(accessToken, metadata, fileContent);
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload para Google Drive:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Upload simples para arquivos pequenos
   */
  private async simpleUpload(
    accessToken: string, 
    metadata: any, 
    fileContent: Buffer
  ): Promise<GoogleDriveUploadResult> {
    try {
      const form = new FormData();
      form.append('metadata', JSON.stringify(metadata), { contentType: 'application/json' });
      form.append('media', fileContent);

      const response = await axios.post(
        `${this.uploadUrl}/files?uploadType=multipart&fields=id,name,size,webViewLink`,
        form,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            ...form.getHeaders()
          }
        }
      );

      return {
        success: true,
        fileId: response.data.id,
        fileName: response.data.name,
        size: parseInt(response.data.size),
        webViewLink: response.data.webViewLink
      };
    } catch (error: any) {
      console.error('Erro no upload simples:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Upload resumível para arquivos grandes
   */
  private async resumableUpload(
    accessToken: string, 
    metadata: any, 
    fileContent: Buffer
  ): Promise<GoogleDriveUploadResult> {
    try {
      // Iniciar sessão de upload resumível
      const initResponse = await axios.post(
        `${this.uploadUrl}/files?uploadType=resumable&fields=id,name,size,webViewLink`,
        JSON.stringify(metadata),
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const uploadUrl = initResponse.headers.location;
      if (!uploadUrl) {
        throw new Error('URL de upload não recebida');
      }

      // Upload do conteúdo
      const uploadResponse = await axios.put(
        uploadUrl,
        fileContent,
        {
          headers: {
            'Content-Length': fileContent.length.toString()
          }
        }
      );

      return {
        success: true,
        fileId: uploadResponse.data.id,
        fileName: uploadResponse.data.name,
        size: parseInt(uploadResponse.data.size),
        webViewLink: uploadResponse.data.webViewLink
      };
    } catch (error: any) {
      console.error('Erro no upload resumível:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Garante que a pasta de backup existe
   */
  private async ensureBackupFolder(accessToken: string): Promise<string | null> {
    try {
      // Se já temos o ID da pasta, verificar se ainda existe
      if (this.config.folderId) {
        try {
          await axios.get(
            `${this.apiUrl}/drive/v3/files/${this.config.folderId}?fields=id,name`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );
          return this.config.folderId;
        } catch (error) {
          console.log('Pasta não encontrada, criando nova...');
        }
      }

      // Procurar pasta existente
      const folderName = this.config.folderName || 'Backups Y BACK';
      const searchResponse = await axios.get(
        `${this.apiUrl}/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (searchResponse.data.files && searchResponse.data.files.length > 0) {
        return searchResponse.data.files[0].id;
      }

      // Criar nova pasta
      const createResponse = await axios.post(
        `${this.apiUrl}/drive/v3/files?fields=id`,
        {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return createResponse.data.id;
    } catch (error: any) {
      console.error('Erro ao gerenciar pasta de backup:', error);
      return null;
    }
  }

  /**
   * Obtém um access token válido, renovando se necessário
   */
  private async getValidAccessToken(): Promise<string | null> {
    // Se temos um access token, tentar usá-lo
    if (this.config.accessToken) {
      try {
        // Testar se o token ainda é válido
        await axios.get(
          `${this.apiUrl}/drive/v3/about?fields=user`,
          {
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`
            }
          }
        );
        return this.config.accessToken;
      } catch (error) {
        console.log('Access token inválido, renovando...');
      }
    }

    // Renovar access token
    return await this.refreshAccessToken();
  }

  /**
   * Renova o access token usando refresh token
   */
  async refreshAccessToken(): Promise<string | null> {
    try {
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.config.refreshToken,
          grant_type: 'refresh_token'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.config.accessToken = response.data.access_token;
      return response.data.access_token;
    } catch (error: any) {
      console.error('Erro ao renovar token Google Drive:', error);
      return null;
    }
  }

  /**
   * Lista arquivos na pasta de backup
   */
  async listFiles(): Promise<{ success: boolean; files?: any[]; error?: string }> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) {
        return {
          success: false,
          error: 'Não foi possível obter access token válido'
        };
      }

      const folderId = await this.ensureBackupFolder(accessToken);
      if (!folderId) {
        return {
          success: false,
          error: 'Não foi possível encontrar pasta de backup'
        };
      }

      const response = await axios.get(
        `${this.apiUrl}/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,size,createdTime,webViewLink)`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return {
        success: true,
        files: response.data.files
      };
    } catch (error: any) {
      console.error('Erro ao listar arquivos Google Drive:', error);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}