import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const CONFIG_FILE = path.join(process.cwd(), 'config', 'secure-config.json');
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'default-key-change-in-production-32bit';

interface SecureConfig {
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  encryptedAt?: string;
}

export class ConfigService {
  private static instance: ConfigService;
  private config: SecureConfig = {};

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Criptografa um valor usando AES-256
   */
  private encrypt(text: string): string {
    if (!text) return '';
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Descriptografa um valor usando AES-256
   */
  private decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    
    try {
      const textParts = encryptedText.split(':');
      if (textParts.length < 2) return '';
      
      textParts.shift(); // Remove IV (não usado no createDecipher)
      const encrypted = textParts.join(':');
      
      const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Erro ao descriptografar:', error);
      return '';
    }
  }

  /**
   * Carrega configurações do arquivo
   */
  private loadConfig(): void {
    try {
      // Criar diretório config se não existir
      const configDir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      if (fs.existsSync(CONFIG_FILE)) {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(configData);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      this.config = {};
    }
  }

  /**
   * Salva configurações no arquivo
   */
  private saveConfig(): void {
    try {
      const configDir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
      
      // Definir permissões restritas (apenas owner)
      fs.chmodSync(CONFIG_FILE, 0o600);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      throw new Error('Erro ao salvar configurações');
    }
  }

  /**
   * Define o token GitHub de forma segura
   */
  setGitHubToken(token: string): void {
    if (!token || token.trim() === '') {
      throw new Error('Token não pode estar vazio');
    }

    // Validar formato básico do token GitHub
    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      throw new Error('Formato de token GitHub inválido');
    }

    this.config.githubToken = this.encrypt(token);
    this.config.encryptedAt = new Date().toISOString();
    this.saveConfig();
  }

  /**
   * Obtém o token GitHub descriptografado
   */
  getGitHubToken(): string {
    if (!this.config.githubToken) {
      return process.env.GITHUB_TOKEN || '';
    }

    return this.decrypt(this.config.githubToken);
  }

  /**
   * Define configurações do repositório GitHub
   */
  setGitHubRepo(owner: string, repo: string): void {
    this.config.githubOwner = owner;
    this.config.githubRepo = repo;
    this.saveConfig();
  }

  /**
   * Obtém configurações do repositório GitHub
   */
  getGitHubRepo(): { owner: string; repo: string } {
    return {
      owner: this.config.githubOwner || process.env.GITHUB_OWNER || 'Mistertelecom',
      repo: this.config.githubRepo || process.env.GITHUB_REPO || 'BACKUPSYS3'
    };
  }

  /**
   * Verifica se o token está configurado
   */
  hasGitHubToken(): boolean {
    return !!(this.config.githubToken || process.env.GITHUB_TOKEN);
  }

  /**
   * Obtém versão mascarada do token para exibição
   */
  getMaskedToken(): string {
    const token = this.getGitHubToken();
    if (!token) return '';
    
    if (token.length <= 8) return '****';
    
    return token.substring(0, 4) + '***' + token.substring(token.length - 4);
  }

  /**
   * Remove token GitHub
   */
  removeGitHubToken(): void {
    delete this.config.githubToken;
    delete this.config.encryptedAt;
    this.saveConfig();
  }

  /**
   * Obtém todas as configurações (sem dados sensíveis)
   */
  getPublicConfig(): {
    hasToken: boolean;
    maskedToken: string;
    owner: string;
    repo: string;
    configuredAt?: string;
  } {
    return {
      hasToken: this.hasGitHubToken(),
      maskedToken: this.getMaskedToken(),
      owner: this.getGitHubRepo().owner,
      repo: this.getGitHubRepo().repo,
      configuredAt: this.config.encryptedAt
    };
  }

  /**
   * Testa conectividade com GitHub usando o token configurado
   */
  async testGitHubConnection(): Promise<{
    success: boolean;
    message: string;
    rateLimitRemaining?: number;
  }> {
    try {
      const token = this.getGitHubToken();
      if (!token) {
        return {
          success: false,
          message: 'Token GitHub não configurado'
        };
      }

      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({
        auth: token,
        userAgent: 'BackupSys3/1.0.0'
      });

      // Testar conexão básica
      const { data: user } = await octokit.rest.users.getAuthenticated();
      const { data: rateLimit } = await octokit.rest.rateLimit.get();

      return {
        success: true,
        message: `Conectado como: ${user.login}`,
        rateLimitRemaining: rateLimit.rate.remaining
      };

    } catch (error: any) {
      console.error('Erro ao testar conexão GitHub:', error);
      
      if (error.status === 401) {
        return {
          success: false,
          message: 'Token inválido ou expirado'
        };
      }

      return {
        success: false,
        message: `Erro de conexão: ${error.message}`
      };
    }
  }
}

export const configService = ConfigService.getInstance();