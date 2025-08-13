import { Telnet } from 'telnet-client';
import ping from 'ping';

export interface TelnetConfig {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeout?: number;
  loginPrompt?: string;
  passwordPrompt?: string;
  shellPrompt?: string;
  equipmentType?: string;
}

export interface TelnetResult {
  success: boolean;
  data?: string;
  error?: string;
  timestamp: string;
}

export interface TelnetConnectivityResult {
  isOnline: boolean;
  telnetConnectable: boolean;
  ping: {
    success: boolean;
    time?: number;
    error?: string;
  };
  telnet: {
    success: boolean;
    error?: string;
  };
}

export class TelnetService {
  private connectionTimeout: number = 15000; // 15 segundos para OLTs

  /**
   * Verifica conectividade completa (ping + Telnet)
   */
  async checkConnectivity(config: TelnetConfig): Promise<TelnetConnectivityResult> {
    console.log(`🔍 Testando conectividade Telnet para ${config.host}:${config.port || 23}`);
    
    const result: TelnetConnectivityResult = {
      isOnline: false,
      telnetConnectable: false,
      ping: { success: false },
      telnet: { success: false }
    };

    try {
      // Test ping first
      console.log(`📡 Ping para ${config.host}...`);
      const pingResult = await ping.promise.probe(config.host, {
        timeout: 5,
        extra: ['-c', '3']
      });

      result.ping.success = pingResult.alive;
      result.ping.time = pingResult.time === 'unknown' ? undefined : parseFloat(pingResult.time as string);
      result.isOnline = pingResult.alive;

      if (!pingResult.alive) {
        result.ping.error = `Host ${config.host} não responde ao ping`;
        console.log(`❌ Ping falhou: ${result.ping.error}`);
        return result;
      }

      console.log(`✅ Ping OK (${result.ping.time}ms)`);

      // Test Telnet connection
      console.log(`🔌 Testando conexão Telnet...`);
      const telnetTest = await this.testTelnetConnection(config);
      result.telnet = telnetTest;
      result.telnetConnectable = telnetTest.success;

      return result;

    } catch (error) {
      console.error(`❌ Erro na verificação de conectividade:`, error);
      result.telnet.error = error instanceof Error ? error.message : 'Erro desconhecido';
      return result;
    }
  }

  /**
   * Testa conexão Telnet básica
   */
  private async testTelnetConnection(config: TelnetConfig): Promise<{ success: boolean; error?: string }> {
    const connection = new Telnet();
    
    try {
      const params = {
        host: config.host,
        port: config.port || 23,
        timeout: config.timeout || this.connectionTimeout,
        shellPrompt: config.shellPrompt || /[$%#>]\s*$/,
        loginPrompt: config.loginPrompt || /login[:\s]*$/i,
        passwordPrompt: config.passwordPrompt || /password[:\s]*$/i,
        username: config.username,
        password: config.password,
        debug: false
      };

      console.log(`🔌 Conectando via Telnet em ${config.host}:${params.port}...`);
      await connection.connect(params);
      
      console.log(`✅ Conexão Telnet estabelecida com sucesso`);
      await connection.end();
      
      return { success: true };

    } catch (error) {
      console.error(`❌ Falha na conexão Telnet:`, error);
      try {
        await connection.end();
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro de conexão Telnet'
      };
    }
  }

  /**
   * Executa comando via Telnet
   */
  async executeCommand(config: TelnetConfig, command: string): Promise<TelnetResult> {
    const timestamp = new Date().toISOString();
    const connection = new Telnet();

    try {
      const params = {
        host: config.host,
        port: config.port || 23,
        timeout: config.timeout || this.connectionTimeout,
        shellPrompt: config.shellPrompt || /[$%#>]\s*$/,
        loginPrompt: config.loginPrompt || /login[:\s]*$/i,
        passwordPrompt: config.passwordPrompt || /password[:\s]*$/i,
        username: config.username,
        password: config.password,
        debug: false
      };

      console.log(`🔌 Conectando via Telnet para executar: ${command}`);
      await connection.connect(params);
      
      console.log(`📝 Executando comando: ${command}`);
      const response = await connection.exec(command);
      
      await connection.end();
      
      console.log(`✅ Comando executado com sucesso`);
      return {
        success: true,
        data: response,
        timestamp
      };

    } catch (error) {
      console.error(`❌ Erro ao executar comando via Telnet:`, error);
      
      try {
        await connection.end();
      } catch (e) {
        // Ignore cleanup errors
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na execução do comando',
        timestamp
      };
    }
  }

  /**
   * Executa múltiplos comandos em sequência
   */
  async executeCommands(config: TelnetConfig, commands: string[]): Promise<TelnetResult[]> {
    const results: TelnetResult[] = [];
    
    for (const command of commands) {
      const result = await this.executeCommand(config, command);
      results.push(result);
      
      // Se um comando falhar, continuar com os próximos
      if (!result.success) {
        console.log(`⚠️ Comando falhou, continuando: ${command}`);
      }
      
      // Pequena pausa entre comandos
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }

  /**
   * Verifica se Telnet está disponível
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Test if telnet-client module is working
      const connection = new Telnet();
      return true;
    } catch (error) {
      console.error('TelnetService não disponível:', error);
      return false;
    }
  }
}