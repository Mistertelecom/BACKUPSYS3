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
  equipmentType?: string;
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
    console.log(`🔍 Testando conectividade para ${config.host}:${config.port}`);
    
    const result: ConnectivityResult = {
      isOnline: false,
      sshConnectable: false,
      ping: { success: false },
      ssh: { success: false }
    };

    try {
      // Teste de ping (Windows usa -n, Unix usa -c)
      const isWindows = process.platform === 'win32';
      console.log(`📡 Executando ping para ${config.host} (Platform: ${process.platform})`);
      
      const pingResult = await ping.promise.probe(config.host, {
        timeout: 5,
        extra: isWindows ? ['-n', '3'] : ['-c', '3']
      });

      console.log(`📡 Resultado do ping:`, pingResult);

      result.ping = {
        success: pingResult.alive,
        time: pingResult.time ? parseFloat(pingResult.time.toString()) : undefined,
        error: pingResult.alive ? undefined : 'Host não responde ao ping'
      };

      result.isOnline = pingResult.alive;

      // Teste de SSH - sempre tentar para Huawei (ICMP pode estar desabilitado)
      const isHuawei = config.equipmentType?.toLowerCase().includes('huawei') || false;
      
      if (pingResult.alive) {
        console.log(`🔑 Testando conexão SSH para ${config.host}:${config.port} como ${config.username}`);
      } else if (isHuawei) {
        console.log(`⚠️  Ping falhou para equipamento Huawei, mas tentando SSH mesmo assim (ICMP pode estar desabilitado)`);
        console.log(`🔑 Testando conexão SSH para ${config.host}:${config.port} como ${config.username}`);
      } else {
        console.log(`❌ Pulando teste SSH - ping falhou para equipamento não-Huawei`);
      }
      
      if (pingResult.alive || isHuawei) {
        try {
          const sshConnection = await this.connect(config);
          await this.disconnect();
          result.ssh = { success: true };
          result.sshConnectable = true;
          console.log(`✅ SSH conectado com sucesso!`);
        } catch (sshError) {
          console.log(`❌ Falha na conexão SSH:`, sshError);
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
      // Timeout específico para equipamentos Huawei/NE (mais tolerante)
      const isHuawei = config.equipmentType?.toLowerCase().includes('huawei') || 
                       config.equipmentType?.toLowerCase().includes('ne20') || 
                       config.equipmentType?.toLowerCase().includes('ne40') || false;
      const timeout = isHuawei ? 20000 : (config.timeout || this.connectionTimeout);
      
      console.log(`🔧 Configurando SSH - Equipamento: ${config.equipmentType || 'Desconhecido'}, Timeout: ${timeout}ms`);
      
      const connectionConfig: any = {
        host: config.host,
        port: config.port,
        username: config.username,
        readyTimeout: timeout,
        algorithms: {
          kex: [
            // Algoritmos legacy para NE20 e equipamentos antigos
            'diffie-hellman-group1-sha1',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group16-sha512',
            'diffie-hellman-group18-sha512',
            'diffie-hellman-group-exchange-sha1',
            'diffie-hellman-group-exchange-sha256',
            // Algoritmos modernos
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521',
            'curve25519-sha256',
            'curve25519-sha256@libssh.org'
          ],
          cipher: [
            // Suporte legacy para NE20
            '3des-cbc',
            'des-cbc',
            'aes128-cbc',
            'aes192-cbc',
            'aes256-cbc',
            // Algoritmos modernos
            'aes128-ctr',
            'aes192-ctr',
            'aes256-ctr',
            'aes128-gcm',
            'aes128-gcm@openssh.com',
            'aes256-gcm',
            'aes256-gcm@openssh.com'
          ],
          serverHostKey: [
            // Suporte DSA/RSA para NE20
            'ssh-dss',
            'ssh-rsa',
            'rsa-sha2-256',
            'rsa-sha2-512',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521',
            'ssh-ed25519'
          ],
          hmac: [
            'hmac-md5',
            'hmac-sha1',
            'hmac-sha1-96',
            'hmac-md5-96',
            'hmac-sha2-256',
            'hmac-sha2-512'
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

      const result = await this.ssh.execCommand(command);

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