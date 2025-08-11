import { useState, useEffect } from 'react';
import { Settings, Github, Eye, EyeOff, TestTube, CheckCircle, XCircle, AlertTriangle, Shield } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface GitHubConfig {
  hasToken: boolean;
  maskedToken: string;
  owner: string;
  repo: string;
  configuredAt?: string;
}

interface ConnectionTest {
  success: boolean;
  message: string;
  rateLimitRemaining?: number;
}

export function ConfigPage() {
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Form states
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [ownerInput, setOwnerInput] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get('/api/config/github/status');
      if (response.data.success) {
        setConfig(response.data.config);
        setConnectionStatus(response.data.connectionStatus);
        setOwnerInput(response.data.config.owner);
        setRepoInput(response.data.config.repo);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      toast.error('Token é obrigatório');
      return;
    }

    if (!tokenInput.startsWith('ghp_') && !tokenInput.startsWith('github_pat_')) {
      toast.error('Token deve começar com ghp_ ou github_pat_');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post('/api/config/github/token', {
        token: tokenInput.trim(),
        testConnection: true
      });

      if (response.data.success) {
        toast.success('Token GitHub configurado com sucesso!');
        setConfig(response.data.config);
        setConnectionStatus(response.data.connectionTest);
        setTokenInput('');
        setShowTokenInput(false);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Erro ao salvar token';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRepo = async () => {
    if (!ownerInput.trim() || !repoInput.trim()) {
      toast.error('Owner e repositório são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post('/api/config/github/repo', {
        owner: ownerInput.trim(),
        repo: repoInput.trim()
      });

      if (response.data.success) {
        toast.success('Repositório configurado com sucesso!');
        setConfig(response.data.config);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Erro ao salvar repositório';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const response = await axios.post('/api/config/github/test');
      
      if (response.data.success) {
        toast.success('Conexão testada com sucesso!');
        setConnectionStatus({
          success: true,
          message: response.data.message,
          rateLimitRemaining: response.data.rateLimitRemaining
        });
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Erro ao testar conexão';
      toast.error(message);
      setConnectionStatus({
        success: false,
        message: message
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRemoveToken = async () => {
    if (!confirm('Tem certeza que deseja remover o token GitHub?')) {
      return;
    }

    setSaving(true);
    try {
      const response = await axios.delete('/api/config/github/token');
      
      if (response.data.success) {
        toast.success('Token removido com sucesso!');
        setConfig(response.data.config);
        setConnectionStatus(null);
        setTokenInput('');
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.error || 'Erro ao remover token';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = () => {
    if (!config?.hasToken) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    if (connectionStatus?.success) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusText = () => {
    if (!config?.hasToken) {
      return 'Token não configurado';
    }
    if (connectionStatus?.success) {
      return 'Conectado com sucesso';
    }
    return 'Erro de conexão';
  };

  const getStatusColor = () => {
    if (!config?.hasToken) {
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
    if (connectionStatus?.success) {
      return 'text-green-600 bg-green-50 border-green-200';
    }
    return 'text-red-600 bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4"></div>
          <div className="h-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        </div>
        <p className="text-gray-600">
          Configure as integrações e ajustes do sistema
        </p>
      </div>

      {/* GitHub Configuration Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <Github className="w-6 h-6 text-gray-800" />
          <h2 className="text-xl font-semibold text-gray-900">Integração GitHub</h2>
        </div>

        {/* Status Card */}
        <div className={`p-4 rounded-lg border mb-6 ${getStatusColor()}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className="font-medium">{getStatusText()}</p>
                {connectionStatus?.message && (
                  <p className="text-sm opacity-80">{connectionStatus.message}</p>
                )}
              </div>
            </div>
            {connectionStatus?.rateLimitRemaining !== undefined && (
              <div className="text-sm opacity-80">
                Rate Limit: {connectionStatus.rateLimitRemaining}
              </div>
            )}
          </div>
        </div>

        {/* Token Configuration */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Token de Acesso</h3>
              <p className="text-gray-600 text-sm">
                Configure o token GitHub para acessar as atualizações
              </p>
            </div>
            <div className="flex gap-2">
              {config?.hasToken && (
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                >
                  <TestTube className="w-4 h-4" />
                  {testing ? 'Testando...' : 'Testar'}
                </button>
              )}
              <button
                onClick={() => setShowTokenInput(!showTokenInput)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Settings className="w-4 h-4" />
                {config?.hasToken ? 'Alterar' : 'Configurar'}
              </button>
            </div>
          </div>

          {config?.hasToken && (
            <div className="p-3 bg-gray-50 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">Token configurado:</span>
                  <code className="text-sm bg-white px-2 py-1 rounded">
                    {config.maskedToken}
                  </code>
                </div>
                <button
                  onClick={handleRemoveToken}
                  disabled={saving}
                  className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
              {config.configuredAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Configurado em: {new Date(config.configuredAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {showTokenInput && (
            <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">Atenção!</span>
                </div>
                <p className="text-sm text-yellow-700 mb-2">
                  O token será criptografado e armazenado de forma segura. Use um token com permissões mínimas.
                </p>
                <p className="text-xs text-yellow-600">
                  Gere um token em: GitHub → Settings → Developer settings → Personal access tokens
                </p>
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-2.5 text-gray-500 hover:text-gray-700"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={handleSaveToken}
                  disabled={saving || !tokenInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => {
                    setShowTokenInput(false);
                    setTokenInput('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Repository Configuration */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Repositório</h3>
          <p className="text-gray-600 text-sm mb-4">
            Configure o repositório GitHub para buscar atualizações
          </p>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner/Organização</label>
              <input
                type="text"
                value={ownerInput}
                onChange={(e) => setOwnerInput(e.target.value)}
                placeholder="Mistertelecom"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Repositório</label>
              <input
                type="text"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                placeholder="BACKUPSYS3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSaveRepo}
                disabled={saving || !ownerInput.trim() || !repoInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Segurança</h4>
            <p className="text-sm text-blue-800">
              Todas as configurações sensíveis são criptografadas antes do armazenamento. 
              Recomendamos usar tokens com permissões mínimas necessárias.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}