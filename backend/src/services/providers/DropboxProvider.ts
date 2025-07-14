import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

export interface DropboxConfig {
  accessToken: string;
  refreshToken?: string;
  appKey?: string;
  appSecret?: string;
  folderPath?: string;
}

export interface DropboxUploadResult {
  success: boolean;
  remotePath?: string;
  size?: number;
  error?: string;
}

export interface DropboxTestResult {
  success: boolean;
  accountInfo?: any;
  error?: string;
}

export class DropboxProvider {
  private config: DropboxConfig;
  private apiUrl = 'https://api.dropboxapi.com/2';
  private contentUrl = 'https://content.dropboxapi.com/2';

  constructor(config: DropboxConfig) {
    this.config = config;
  }

  /**
   * Testa conectividade com o Dropbox
   */
  async testConnection(): Promise<DropboxTestResult> {
    try {
      console.log(`🔧 Dropbox: Testando token: ${this.config.accessToken?.substring(0, 10)}...`);
      
      const response = await axios.post(
        `${this.apiUrl}/users/get_current_account`,
        null,
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const data = response.data as any;
      console.log(`✅ Dropbox: Conectado como ${data.name?.display_name} (${data.email})`);
      
      return {
        success: true,
        accountInfo: {
          name: data.name?.display_name,
          email: data.email,
          accountId: data.account_id
        }
      };
    } catch (error: any) {
      console.error('❌ Erro ao testar conexão Dropbox:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout
        }
      });
      
      let errorMessage = 'Erro desconhecido';
      
      if (error.response) {
        // Erro de resposta da API
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          errorMessage = 'Token de acesso inválido ou expirado';
        } else if (status === 400) {
          errorMessage = `Requisição inválida: ${data?.error_summary || data?.error || 'Dados incorretos'}`;
        } else if (status === 429) {
          errorMessage = 'Muitas requisições - limite de API excedido';
        } else if (status >= 500) {
          errorMessage = 'Erro interno do Dropbox - tente novamente';
        } else {
          errorMessage = data?.error_summary || data?.error || `Erro HTTP ${status}`;
        }
      } else if (error.request) {
        // Erro de rede
        errorMessage = 'Erro de conexão - verifique sua internet e tente novamente';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Não foi possível conectar ao Dropbox - verifique sua conexão';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Timeout na conexão com o Dropbox';
      } else {
        errorMessage = error.message;
      }
      
      console.error(`❌ Dropbox: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Faz upload de um arquivo para o Dropbox
   */
  async uploadFile(localFilePath: string, fileName: string): Promise<DropboxUploadResult> {
    try {
      if (!fs.existsSync(localFilePath)) {
        return {
          success: false,
          error: 'Arquivo não encontrado'
        };
      }

      const fileContent = fs.readFileSync(localFilePath);
      const folderPath = this.config.folderPath || '/backups';
      const remotePath = `${folderPath}/${fileName}`.replace('//', '/');

      // Para arquivos pequenos (< 150MB), usar upload simples
      if (fileContent.length < 150 * 1024 * 1024) {
        const response = await axios.post(
          `${this.contentUrl}/files/upload`,
          fileContent,
          {
            headers: {
              'Authorization': `Bearer ${this.config.accessToken}`,
              'Content-Type': 'application/octet-stream',
              'Dropbox-API-Arg': JSON.stringify({
                path: remotePath,
                mode: 'overwrite',
                autorename: false
              })
            }
          }
        );

        return {
          success: true,
          remotePath: (response.data as any).path_display,
          size: (response.data as any).size
        };
      } else {
        // Para arquivos grandes, usar sessão de upload
        return await this.uploadLargeFile(fileContent, remotePath);
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload para Dropbox:', error);
      return {
        success: false,
        error: error.response?.data?.error_summary || error.message
      };
    }
  }

  /**
   * Upload de arquivos grandes usando sessão
   */
  private async uploadLargeFile(fileContent: Buffer, remotePath: string): Promise<DropboxUploadResult> {
    try {
      // Iniciar sessão de upload
      const sessionResponse = await axios.post(
        `${this.contentUrl}/files/upload_session/start`,
        fileContent.slice(0, 8 * 1024 * 1024), // Primeiro chunk de 8MB
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/octet-stream'
          }
        }
      );

      const sessionId = (sessionResponse.data as any).session_id;
      let offset = 8 * 1024 * 1024;

      // Upload dos chunks restantes
      while (offset < fileContent.length) {
        const chunkSize = Math.min(8 * 1024 * 1024, fileContent.length - offset);
        const chunk = fileContent.slice(offset, offset + chunkSize);
        const isLastChunk = offset + chunkSize >= fileContent.length;

        if (isLastChunk) {
          // Último chunk - finalizar upload
          const finishResponse = await axios.post(
            `${this.contentUrl}/files/upload_session/finish`,
            chunk,
            {
              headers: {
                'Authorization': `Bearer ${this.config.accessToken}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                  cursor: {
                    session_id: sessionId,
                    offset: offset
                  },
                  commit: {
                    path: remotePath,
                    mode: 'overwrite',
                    autorename: false
                  }
                })
              }
            }
          );

          return {
            success: true,
            remotePath: (finishResponse.data as any).path_display,
            size: (finishResponse.data as any).size
          };
        } else {
          // Chunk intermediário
          await axios.post(
            `${this.contentUrl}/files/upload_session/append_v2`,
            chunk,
            {
              headers: {
                'Authorization': `Bearer ${this.config.accessToken}`,
                'Content-Type': 'application/octet-stream',
                'Dropbox-API-Arg': JSON.stringify({
                  cursor: {
                    session_id: sessionId,
                    offset: offset
                  }
                })
              }
            }
          );
        }

        offset += chunkSize;
      }

      throw new Error('Upload incompleto');
    } catch (error: any) {
      console.error('Erro no upload de arquivo grande:', error);
      return {
        success: false,
        error: error.response?.data?.error_summary || error.message
      };
    }
  }

  /**
   * Renova o access token usando refresh token
   */
  async refreshAccessToken(): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    if (!this.config.refreshToken || !this.config.appKey || !this.config.appSecret) {
      return {
        success: false,
        error: 'Refresh token, app key e app secret são necessários'
      };
    }

    try {
      const response = await axios.post(
        'https://api.dropbox.com/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.config.refreshToken,
          client_id: this.config.appKey,
          client_secret: this.config.appSecret
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        success: true,
        accessToken: (response.data as any).access_token
      };
    } catch (error: any) {
      console.error('Erro ao renovar token Dropbox:', error);
      return {
        success: false,
        error: error.response?.data?.error_description || error.message
      };
    }
  }

  /**
   * Lista arquivos na pasta de backup
   */
  async listFiles(): Promise<{ success: boolean; files?: any[]; error?: string }> {
    try {
      const folderPath = this.config.folderPath || '/backups';
      
      const response = await axios.post(
        `${this.apiUrl}/files/list_folder`,
        {
          path: folderPath === '/' ? '' : folderPath
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        files: (response.data as any).entries
      };
    } catch (error: any) {
      console.error('Erro ao listar arquivos Dropbox:', error);
      return {
        success: false,
        error: error.response?.data?.error_summary || error.message
      };
    }
  }
}