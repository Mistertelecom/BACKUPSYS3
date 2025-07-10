import axios, { AxiosInstance, AxiosResponse } from 'axios';
import ping from 'ping';
import fs from 'fs';
import path from 'path';
import https from 'https';

export interface HTTPConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
  protocol?: 'http' | 'https';
  timeout?: number;
  ignoreCertificateErrors?: boolean;
}

export interface HTTPResult {
  success: boolean;
  data?: string;
  statusCode?: number;
  error?: string;
  timestamp: string;
}

export interface ConnectivityResult {
  isOnline: boolean;
  httpConnectable: boolean;
  ping: {
    success: boolean;
    time?: number;
    error?: string;
  };
  http: {
    success: boolean;
    error?: string;
  };
}

export class HTTPService {
  private axiosInstance: AxiosInstance | null = null;
  private connectionTimeout: number = 15000; // 15 segundos
  private currentConfig: HTTPConfig | null = null;

  constructor() {}

  /**
   * Verifica conectividade completa (ping + HTTP)
   */
  async checkConnectivity(config: HTTPConfig): Promise<ConnectivityResult> {
    const result: ConnectivityResult = {
      isOnline: false,
      httpConnectable: false,
      ping: { success: false },
      http: { success: false }
    };

    try {
      // Teste de ping
      const pingResult = await ping.promise.probe(config.host, {
        timeout: 5,
        min_reply: 1
      });

      result.ping = {
        success: pingResult.alive,
        time: pingResult.time ? parseFloat(pingResult.time.toString()) : undefined,
        error: pingResult.alive ? undefined : 'Host não responde ao ping'
      };

      result.isOnline = pingResult.alive;

      // Teste de conectividade HTTP apenas se ping passou
      if (pingResult.alive) {
        try {
          const protocol = config.protocol || 'http';
          const port = config.port || (protocol === 'https' ? 443 : 80);
          const baseURL = `${protocol}://${config.host}:${port}`;

          // Configurar axios para teste de conectividade
          const testAxios = axios.create({
            baseURL,
            timeout: this.connectionTimeout,
            validateStatus: () => true, // Aceitar qualquer status code
            httpsAgent: config.ignoreCertificateErrors ? new https.Agent({
              rejectUnauthorized: false
            }) : undefined
          });

          const response = await testAxios.get('/');
          
          result.http = {
            success: response.status < 500, // Considerar sucesso se não for erro 5xx
          };
          
          result.httpConnectable = result.http.success;
        } catch (error) {
          result.http = {
            success: false,
            error: error instanceof Error ? error.message : 'Erro de conectividade HTTP'
          };
        }
      }
    } catch (error) {
      result.ping.error = error instanceof Error ? error.message : 'Erro no teste de ping';
    }

    return result;
  }

  /**
   * Conecta à interface web do equipamento
   */
  async connect(config: HTTPConfig): Promise<HTTPResult> {
    const timestamp = new Date().toISOString();
    
    try {
      const protocol = config.protocol || 'http';
      const port = config.port || (protocol === 'https' ? 443 : 80);
      const baseURL = `${protocol}://${config.host}:${port}`;

      // Configurar axios instance
      this.axiosInstance = axios.create({
        baseURL,
        timeout: config.timeout || this.connectionTimeout,
        validateStatus: () => true, // Não lançar erro para status codes específicos
        httpsAgent: config.ignoreCertificateErrors ? new https.Agent({
          rejectUnauthorized: false
        }) : undefined
      });

      this.currentConfig = config;

      // Testar conexão inicial
      const testResponse = await this.axiosInstance.get('/');
      
      if (testResponse.status >= 400) {
        return {
          success: false,
          error: `HTTP ${testResponse.status}: ${testResponse.statusText}`,
          statusCode: testResponse.status,
          timestamp
        };
      }

      return {
        success: true,
        data: 'Conectado com sucesso à interface web',
        statusCode: testResponse.status,
        timestamp
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido na conexão HTTP',
        timestamp
      };
    }
  }

  /**
   * Realiza login na interface web
   */
  async login(): Promise<HTTPResult> {
    const timestamp = new Date().toISOString();
    
    if (!this.axiosInstance || !this.currentConfig) {
      return {
        success: false,
        error: 'Não conectado - execute connect() primeiro',
        timestamp
      };
    }

    try {
      // Primeira tentativa: Login direto via POST (padrão mais comum)
      const loginData = {
        username: this.currentConfig.username,
        password: this.currentConfig.password
      };

      let response = await this.axiosInstance.post('/login', loginData);
      
      // Se login direto falhar, tentar outras rotas comuns
      if (response.status >= 400) {
        // Tentar rota alternativa
        response = await this.axiosInstance.post('/cgi-bin/login', loginData);
      }

      if (response.status >= 400) {
        // Tentar com form-data
        const formData = new URLSearchParams();
        formData.append('username', this.currentConfig.username);
        formData.append('password', this.currentConfig.password);
        
        response = await this.axiosInstance.post('/login', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      }

      if (response.status < 400) {
        // Extrair cookies de sessão se houver
        const setCookieHeader = response.headers['set-cookie'];
        if (setCookieHeader) {
          // Configurar cookies para próximas requisições
          this.axiosInstance.defaults.headers.Cookie = setCookieHeader.join('; ');
        }

        return {
          success: true,
          data: 'Login realizado com sucesso',
          statusCode: response.status,
          timestamp
        };
      } else {
        return {
          success: false,
          error: `Falha no login: HTTP ${response.status}`,
          statusCode: response.status,
          timestamp
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no login HTTP',
        timestamp
      };
    }
  }

  /**
   * Faz download de arquivo de configuração
   */
  async downloadConfigFile(fileName: string, localPath: string): Promise<HTTPResult> {
    const timestamp = new Date().toISOString();
    
    if (!this.axiosInstance) {
      return {
        success: false,
        error: 'Não conectado - execute connect() primeiro',
        timestamp
      };
    }

    try {
      // Rotas comuns para download de configuração
      const possibleRoutes = [
        `/backup/${fileName}`,
        `/download/${fileName}`,
        `/config/${fileName}`,
        `/cgi-bin/backup`,
        `/cgi-bin/download`,
        `/${fileName}`
      ];

      let response: AxiosResponse<any> | null = null;
      let successRoute = '';

      // Tentar diferentes rotas até encontrar uma que funcione
      for (const route of possibleRoutes) {
        try {
          response = await this.axiosInstance.get(route, {
            responseType: 'stream' // Para download de arquivo
          });
          
          if (response.status === 200) {
            successRoute = route;
            break;
          }
        } catch (error) {
          // Continuar tentando outras rotas
          continue;
        }
      }

      if (!response || response.status !== 200) {
        return {
          success: false,
          error: 'Não foi possível localizar o arquivo de configuração',
          timestamp
        };
      }

      // Criar diretório se não existir
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Salvar arquivo
      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);

      return new Promise((resolve) => {
        writer.on('finish', () => {
          resolve({
            success: true,
            data: `Arquivo baixado com sucesso de ${successRoute}`,
            statusCode: response!.status,
            timestamp
          });
        });

        writer.on('error', (error) => {
          resolve({
            success: false,
            error: `Erro ao salvar arquivo: ${error.message}`,
            timestamp
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no download HTTP',
        timestamp
      };
    }
  }

  /**
   * Faz logout e desconecta
   */
  async disconnect(): Promise<void> {
    if (this.axiosInstance) {
      try {
        // Tentar fazer logout se possível
        await this.axiosInstance.post('/logout').catch(() => {
          // Ignorar erros de logout
        });
      } catch (error) {
        // Ignorar erros de logout
      }
      
      this.axiosInstance = null;
      this.currentConfig = null;
    }
  }

  /**
   * Executa requisição personalizada
   */
  async customRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any
  ): Promise<HTTPResult> {
    const timestamp = new Date().toISOString();
    
    if (!this.axiosInstance) {
      return {
        success: false,
        error: 'Não conectado - execute connect() primeiro',
        timestamp
      };
    }

    try {
      const response = await this.axiosInstance.request({
        method,
        url,
        data
      });

      return {
        success: response.status < 400,
        data: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        statusCode: response.status,
        timestamp
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na requisição HTTP',
        timestamp
      };
    }
  }
}