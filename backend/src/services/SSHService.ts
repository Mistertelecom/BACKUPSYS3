import { NodeSSH } from 'node-ssh';
import ping from 'ping';
import fs from 'fs';
import path from 'path';

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  timeout?: number;
}

export interface SSHResult {
  success: boolean;
  data?: string;
  error?: string;
  timestamp: string;
}

export interface ConnectivityResult {
  isOnline: boolean;
  sshConnectable: boolean;
  ping: {
    success: boolean;
    time?: number;
    error?: string;
  };
  ssh: {
    success: boolean;
    error?: string;
  };
}

export class SSHService {
  private ssh: NodeSSH;
  private connectionTimeout: number = 10000; // 10 segundos

  constructor() {
    this.ssh = new NodeSSH();
  }

  /**
   * Verifica conectividade completa (ping + SSH)
   */
  async checkConnectivity(config: SSHConfig): Promise<ConnectivityResult> {
    const result: ConnectivityResult = {
      isOnline: false,
      sshConnectable: false,
      ping: { success: false },
      ssh: { success: false }
    };

    try {
      // Teste de ping
      const pingResult = await ping.promise.probe(config.host, {
        timeout: 5,
        extra: ['-c', '3']
      });

      result.ping = {
        success: pingResult.alive,
        time: pingResult.time ? parseFloat(pingResult.time.toString()) : undefined,
        error: pingResult.alive ? undefined : 'Host não responde ao ping'
      };

      result.isOnline = pingResult.alive;

      // Teste de SSH apenas se ping for bem-sucedido
      if (pingResult.alive) {
        try {
          const sshConnection = await this.connect(config);
          await this.disconnect();
          result.ssh = { success: true };
          result.sshConnectable = true;
        } catch (sshError) {
          result.ssh = {
            success: false,
            error: sshError instanceof Error ? sshError.message : 'Erro desconhecido de SSH'
          };
        }
      }

    } catch (error) {
      result.ping = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }

    return result;
  }

  /**
   * Conecta via SSH
   */
  async connect(config: SSHConfig): Promise<NodeSSH> {
    try {
      const connectionConfig: any = {
        host: config.host,
        port: config.port,
        username: config.username,
        readyTimeout: config.timeout || this.connectionTimeout,
        algorithms: {
          kex: [
            'diffie-hellman-group1-sha1',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group16-sha512',
            'diffie-hellman-group18-sha512',
            'diffie-hellman-group-exchange-sha1',
            'diffie-hellman-group-exchange-sha256',
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521',
            'curve25519-sha256',
            'curve25519-sha256@libssh.org'
          ],
          cipher: [
            'aes128-ctr',
            'aes192-ctr',
            'aes256-ctr',
            'aes128-gcm',
            'aes128-gcm@openssh.com',
            'aes256-gcm',
            'aes256-gcm@openssh.com',
            'aes256-cbc',
            'aes128-cbc',
            '3des-cbc'
          ],
          hmac: [
            'hmac-sha2-256',
            'hmac-sha2-512',
            'hmac-sha1',
            'hmac-md5'
          ]
        }
      };

      if (config.privateKey) {
        connectionConfig.privateKey = config.privateKey;
      } else if (config.password) {
        connectionConfig.password = config.password;
      } else {
        throw new Error('É necessário fornecer senha ou chave privada');
      }

      await this.ssh.connect(connectionConfig);
      return this.ssh;
    } catch (error) {
      throw new Error(`Falha na conexão SSH: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Executa comando via SSH
   */
  async executeCommand(command: string): Promise<SSHResult> {
    try {
      if (!this.ssh.isConnected()) {
        throw new Error('Conexão SSH não estabelecida');
      }

      const result = await this.ssh.execCommand(command, {
        options: { pty: true }
      });

      return {
        success: result.code === 0,
        data: result.stdout || result.stderr,
        error: result.code !== 0 ? result.stderr : undefined,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Executa múltiplos comandos em sequência
   */
  async executeCommands(commands: string[]): Promise<SSHResult[]> {
    const results: SSHResult[] = [];

    for (const command of commands) {
      const result = await this.executeCommand(command);
      results.push(result);
      
      // Para se algum comando falhar
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Faz download de arquivo via SSH
   */
  async downloadFile(remotePath: string, localPath: string): Promise<SSHResult> {
    try {
      if (!this.ssh.isConnected()) {
        throw new Error('Conexão SSH não estabelecida');
      }

      // Criar diretório local se não existir
      const localDir = path.dirname(localPath);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      await this.ssh.getFile(localPath, remotePath);

      return {
        success: true,
        data: `Arquivo baixado: ${remotePath} -> ${localPath}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Faz upload de arquivo via SSH
   */
  async uploadFile(localPath: string, remotePath: string): Promise<SSHResult> {
    try {
      if (!this.ssh.isConnected()) {
        throw new Error('Conexão SSH não estabelecida');
      }

      if (!fs.existsSync(localPath)) {
        throw new Error(`Arquivo local não encontrado: ${localPath}`);
      }

      await this.ssh.putFile(localPath, remotePath);

      return {
        success: true,
        data: `Arquivo enviado: ${localPath} -> ${remotePath}`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Desconecta SSH
   */
  async disconnect(): Promise<void> {
    try {
      if (this.ssh.isConnected()) {
        this.ssh.dispose();
      }
    } catch (error) {
      console.error('Erro ao desconectar SSH:', error);
    }
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.ssh.isConnected();
  }
}