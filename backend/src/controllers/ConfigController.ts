import { Request, Response } from 'express';
import { configService } from '../services/ConfigService';

export class ConfigController {
  /**
   * Obtém configurações públicas GitHub
   */
  static async getGitHubConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = configService.getPublicConfig();
      
      res.json({
        success: true,
        config
      });
    } catch (error: any) {
      console.error('Erro ao obter configurações GitHub:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter configurações',
        message: error.message
      });
    }
  }

  /**
   * Configura token GitHub
   */
  static async setGitHubToken(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔧 ConfigController.setGitHubToken - Início');
      const { token, testConnection = true } = req.body;
      console.log('🔧 Token recebido:', token ? `${token.substring(0, 8)}...` : 'null');

      if (!token || typeof token !== 'string') {
        console.log('❌ Token inválido ou vazio');
        res.status(400).json({
          success: false,
          error: 'Token é obrigatório'
        });
        return;
      }

      // Remover espaços em branco
      const cleanToken = token.trim();
      console.log('🔧 Token limpo:', `${cleanToken.substring(0, 8)}...`);

      // Validação básica do formato
      if (!cleanToken.startsWith('ghp_') && !cleanToken.startsWith('github_pat_')) {
        console.log('❌ Formato de token inválido');
        res.status(400).json({
          success: false,
          error: 'Formato de token GitHub inválido. Use tokens que começam com ghp_ ou github_pat_'
        });
        return;
      }

      // Salvar token (será criptografado automaticamente)
      console.log('💾 Salvando token...');
      configService.setGitHubToken(cleanToken);
      console.log('✅ Token salvo com sucesso');

      // Testar conexão se solicitado
      let connectionTest = null;
      if (testConnection) {
        console.log('🔍 Testando conexão GitHub...');
        connectionTest = await configService.testGitHubConnection();
        console.log('🔍 Resultado do teste:', connectionTest);
        
        if (!connectionTest.success) {
          console.log('❌ Teste de conexão falhou, removendo token');
          // Remover token se a conexão falhou
          configService.removeGitHubToken();
          
          res.status(400).json({
            success: false,
            error: 'Token inválido',
            message: connectionTest.message
          });
          return;
        }
      }

      const config = configService.getPublicConfig();
      console.log('✅ Configuração finalizada:', {
        hasToken: config.hasToken,
        maskedToken: config.maskedToken
      });

      res.json({
        success: true,
        message: 'Token GitHub configurado com sucesso',
        config,
        connectionTest
      });
    } catch (error: any) {
      console.error('❌ Erro ao configurar token GitHub:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao configurar token',
        message: error.message
      });
    }
  }

  /**
   * Configura repositório GitHub
   */
  static async setGitHubRepo(req: Request, res: Response): Promise<void> {
    try {
      const { owner, repo } = req.body;

      if (!owner || !repo) {
        res.status(400).json({
          success: false,
          error: 'Owner e repo são obrigatórios'
        });
        return;
      }

      // Validação básica
      if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
        res.status(400).json({
          success: false,
          error: 'Owner e repo devem conter apenas letras, números, hífens, pontos e underscores'
        });
        return;
      }

      configService.setGitHubRepo(owner, repo);
      const config = configService.getPublicConfig();

      res.json({
        success: true,
        message: 'Repositório GitHub configurado com sucesso',
        config
      });
    } catch (error: any) {
      console.error('Erro ao configurar repositório GitHub:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao configurar repositório',
        message: error.message
      });
    }
  }

  /**
   * Testa conexão GitHub
   */
  static async testGitHubConnection(req: Request, res: Response): Promise<void> {
    try {
      const result = await configService.testGitHubConnection();
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          rateLimitRemaining: result.rateLimitRemaining
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Falha na conexão',
          message: result.message
        });
      }
    } catch (error: any) {
      console.error('Erro ao testar conexão GitHub:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao testar conexão',
        message: error.message
      });
    }
  }

  /**
   * Remove token GitHub
   */
  static async removeGitHubToken(req: Request, res: Response): Promise<void> {
    try {
      configService.removeGitHubToken();
      const config = configService.getPublicConfig();

      res.json({
        success: true,
        message: 'Token GitHub removido com sucesso',
        config
      });
    } catch (error: any) {
      console.error('Erro ao remover token GitHub:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao remover token',
        message: error.message
      });
    }
  }

  /**
   * Obtém status de configuração do GitHub
   */
  static async getGitHubStatus(req: Request, res: Response): Promise<void> {
    try {
      const config = configService.getPublicConfig();
      let connectionStatus = null;

      if (config.hasToken) {
        connectionStatus = await configService.testGitHubConnection();
      }

      res.json({
        success: true,
        config,
        connectionStatus,
        isConfigured: config.hasToken,
        isConnected: connectionStatus?.success || false
      });
    } catch (error: any) {
      console.error('Erro ao obter status GitHub:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao obter status',
        message: error.message
      });
    }
  }
}