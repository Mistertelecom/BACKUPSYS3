import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Settings, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Server,
  Network,
  Shield,
  Terminal,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';

interface IPSecConfig {
  equipmentType: 'mikrotik' | 'cisco' | 'huawei' | 'pfsense' | 'fortigate';
  clientName: string;
  clientIP: string;
  clientNetwork: string;
  vpsIP: string;
  vpsNetwork: string;
  pskKey: string;
  encryption: 'aes128' | 'aes256';
  authentication: 'sha1' | 'sha256' | 'sha512';
  dhGroup: 'modp1024' | 'modp2048' | 'modp4096';
  pfsGroup: 'modp1024' | 'modp2048' | 'modp4096';
  ikeVersion: 'ikev1' | 'ikev2';
}

interface TestResult {
  status: 'testing' | 'success' | 'error' | 'idle';
  message: string;
  details?: string;
  timestamp?: string;
}

export function IntegrationPage() {
  const [config, setConfig] = useState<IPSecConfig>({
    equipmentType: 'mikrotik',
    clientName: '',
    clientIP: 'dynamic',
    clientNetwork: '',
    vpsIP: '',
    vpsNetwork: '10.100.0.0/24',
    pskKey: '',
    encryption: 'aes256',
    authentication: 'sha256',
    dhGroup: 'modp4096',
    pfsGroup: 'modp4096',
    ikeVersion: 'ikev2'
  });

  const [generatedConfig, setGeneratedConfig] = useState<string>('');
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle', message: '' });
  const [showPSK, setShowPSK] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const equipmentTypes = [
    { value: 'mikrotik', label: 'MikroTik RouterOS', icon: '🔶' },
    { value: 'cisco', label: 'Cisco IOS/ASA', icon: '🔵' },
    { value: 'huawei', label: 'Huawei VRP', icon: '🔴' },
    { value: 'pfsense', label: 'pfSense', icon: '🟠' },
    { value: 'fortigate', label: 'FortiGate', icon: '🟢' }
  ];

  const encryptionOptions = [
    { value: 'aes128', label: 'AES-128' },
    { value: 'aes256', label: 'AES-256 (Recomendado)' }
  ];

  const authenticationOptions = [
    { value: 'sha1', label: 'SHA-1' },
    { value: 'sha256', label: 'SHA-256 (Recomendado)' },
    { value: 'sha512', label: 'SHA-512' }
  ];

  const dhGroupOptions = [
    { value: 'modp1024', label: 'DH Group 2 (1024-bit)' },
    { value: 'modp2048', label: 'DH Group 14 (2048-bit)' },
    { value: 'modp4096', label: 'DH Group 16 (4096-bit) - Recomendado' }
  ];

  useEffect(() => {
    // Gerar PSK automático se vazio
    if (!config.pskKey) {
      generatePSK();
    }
    
    // Buscar IP da VPS automaticamente
    fetchVPSInfo();
  }, []);

  const generatePSK = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setConfig(prev => ({ ...prev, pskKey: result }));
  };

  const fetchVPSInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('Token não encontrado, usando valores padrão');
        setConfig(prev => ({ 
          ...prev, 
          vpsIP: 'auto-detect',
          vpsNetwork: '10.100.0.0/24'
        }));
        return;
      }

      const response = await fetch('/api/integration/vps-info', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Token inválido ou expirado, usando valores padrão');
          setConfig(prev => ({ 
            ...prev, 
            vpsIP: 'auto-detect',
            vpsNetwork: '10.100.0.0/24'
          }));
          return;
        }
        
        // Log da resposta para debug
        const responseText = await response.text();
        console.error(`HTTP ${response.status}: ${response.statusText}`, responseText);
        throw new Error(`Erro ${response.status}: Servidor indisponível`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Resposta não-JSON recebida:', responseText);
        
        // Usar valores padrão em vez de falhar
        setConfig(prev => ({ 
          ...prev, 
          vpsIP: 'auto-detect',
          vpsNetwork: '10.100.0.0/24'
        }));
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setConfig(prev => ({ 
          ...prev, 
          vpsIP: data.vpsIP,
          vpsNetwork: data.vpsNetwork || '10.100.0.0/24'
        }));
      } else {
        console.warn('API retornou erro:', data.error);
        setConfig(prev => ({ 
          ...prev, 
          vpsIP: 'auto-detect',
          vpsNetwork: '10.100.0.0/24'
        }));
      }
    } catch (error) {
      // Silenciar erro e usar valores padrão
      setConfig(prev => ({ 
        ...prev, 
        vpsIP: 'auto-detect',
        vpsNetwork: '10.100.0.0/24'
      }));
    }
  };

  const generateConfiguration = async () => {
    if (!config.clientName || !config.clientNetwork) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/integration/generate-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      if (data.success) {
        setGeneratedConfig(data.configuration);
        
        // Atualizar IP da VPS se foi detectado automaticamente
        if (data.detectedVpsIP && data.detectedVpsIP !== '0.0.0.0') {
          setConfig(prev => ({ ...prev, vpsIP: data.detectedVpsIP }));
        }
        
        toast.success(`Configuração gerada com sucesso! ${
          data.detectedVpsIP && data.detectedVpsIP !== '0.0.0.0' 
            ? `(IP VPS: ${data.detectedVpsIP})`
            : ''
        }`);
      } else {
        throw new Error(data.error || 'Erro ao gerar configuração');
      }
    } catch (error: any) {
      console.error('Erro ao gerar configuração:', error);
      toast.error(error.message || 'Erro ao gerar configuração');
    } finally {
      setIsGenerating(false);
    }
  };

  const testConnectivity = async () => {
    if (!config.clientIP || config.clientIP === 'dynamic') {
      toast.error('Teste disponível apenas para clientes com IP fixo');
      return;
    }

    setTestResult({ status: 'testing', message: 'Testando conectividade...' });
    
    try {
      const response = await fetch('/api/integration/test-connectivity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          clientIP: config.clientIP,
          clientNetwork: config.clientNetwork,
          equipmentType: config.equipmentType
        })
      });

      const data = await response.json();
      
      setTestResult({
        status: data.success ? 'success' : 'error',
        message: data.message,
        details: data.details,
        timestamp: new Date().toLocaleString('pt-BR')
      });

      if (data.success) {
        toast.success('Conectividade testada com sucesso!');
      } else {
        toast.error('Falha no teste de conectividade');
      }
    } catch (error: any) {
      console.error('Erro no teste:', error);
      setTestResult({
        status: 'error',
        message: 'Erro ao executar teste de conectividade',
        details: error.message,
        timestamp: new Date().toLocaleString('pt-BR')
      });
      toast.error('Erro ao executar teste');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Configuração copiada para a área de transferência!');
    } catch (error) {
      toast.error('Erro ao copiar configuração');
    }
  };

  const downloadConfig = () => {
    if (!generatedConfig) {
      toast.error('Gere a configuração primeiro');
      return;
    }

    const blob = new Blob([generatedConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.clientName}-ipsec-${config.equipmentType}.conf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Configuração baixada com sucesso!');
  };

  const getTestStatusIcon = () => {
    switch (testResult.status) {
      case 'testing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Network className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integração IPSec</h1>
          <p className="text-gray-600 mt-1">Configure túneis IPSec para acesso remoto aos equipamentos</p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="w-8 h-8 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">Site-to-Site VPN</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Configuração */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Configuração do Cliente</h2>
            </div>
          </div>
          
          <div className="card-body space-y-4">
            {/* Tipo de Equipamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Equipamento *
              </label>
              <div className="grid grid-cols-1 gap-2">
                {equipmentTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      config.equipmentType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={type.value}
                      checked={config.equipmentType === type.value}
                      onChange={(e) => setConfig(prev => ({ ...prev, equipmentType: e.target.value as any }))}
                      className="sr-only"
                    />
                    <span className="text-lg mr-3">{type.icon}</span>
                    <span className="font-medium">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Informações Básicas */}
            <InputField
              label="Nome do Cliente *"
              type="text"
              value={config.clientName}
              onChange={(e) => setConfig(prev => ({ ...prev, clientName: e.target.value }))}
              placeholder="Ex: Cliente A - Matriz"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conectividade do Cliente *
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer transition-colors hover:border-gray-300">
                  <input
                    type="radio"
                    name="clientConnectivity"
                    value="static"
                    checked={config.clientIP !== 'dynamic' && config.clientIP !== ''}
                    onChange={() => setConfig(prev => ({ ...prev, clientIP: '1.2.3.4' }))}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">IP Público Fixo</span>
                    <p className="text-sm text-gray-600">Cliente possui IP público dedicado</p>
                  </div>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer transition-colors hover:border-gray-300">
                  <input
                    type="radio"
                    name="clientConnectivity"
                    value="dynamic"
                    checked={config.clientIP === 'dynamic' || config.clientIP === ''}
                    onChange={() => setConfig(prev => ({ ...prev, clientIP: 'dynamic' }))}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium">IP Dinâmico/NAT/CGNAT</span>
                    <p className="text-sm text-gray-600">Cliente sem IP fixo (mais comum)</p>
                  </div>
                </label>
              </div>
              
              {config.clientIP !== 'dynamic' && config.clientIP !== '' && (
                <div className="mt-3">
                  <InputField
                    label="IP Público do Cliente"
                    type="text"
                    value={config.clientIP}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientIP: e.target.value }))}
                    placeholder="Ex: 203.0.113.1"
                  />
                </div>
              )}
            </div>

            <InputField
              label="Rede Local do Cliente *"
              type="text"
              value={config.clientNetwork}
              onChange={(e) => setConfig(prev => ({ ...prev, clientNetwork: e.target.value }))}
              placeholder="Ex: 192.168.1.0/24"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IP da VPS (Servidor)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={config.vpsIP}
                  onChange={(e) => setConfig(prev => ({ ...prev, vpsIP: e.target.value }))}
                  className="input pr-24"
                  placeholder="Ex: 203.0.113.100"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                  {config.vpsIP === 'auto-detect' ? (
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded flex items-center">
                      🔍 Auto
                    </span>
                  ) : config.vpsIP && config.vpsIP !== '0.0.0.0' && config.vpsIP.match(/^\d+\.\d+\.\d+\.\d+$/) ? (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded flex items-center">
                      ✓ Detectado
                    </span>
                  ) : config.vpsIP === '0.0.0.0' ? (
                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded flex items-center">
                      ❌ Erro
                    </span>
                  ) : (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded flex items-center">
                      ✏️ Manual
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {config.vpsIP === 'auto-detect' 
                  ? 'IP será detectado automaticamente na geração'
                  : 'IP público da VPS onde está rodando o Y BACK'
                }
              </p>
            </div>

            <InputField
              label="Rede da VPS"
              type="text"
              value={config.vpsNetwork}
              onChange={(e) => setConfig(prev => ({ ...prev, vpsNetwork: e.target.value }))}
              placeholder="Ex: 10.100.0.0/24"
            />

            {/* PSK */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pre-Shared Key (PSK) *
              </label>
              <div className="relative">
                <input
                  type={showPSK ? 'text' : 'password'}
                  value={config.pskKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, pskKey: e.target.value }))}
                  className="input pr-20"
                  placeholder="Chave gerada automaticamente"
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowPSK(!showPSK)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    {showPSK ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={generatePSK}
                    className="p-1 hover:bg-gray-100 rounded text-blue-600"
                    title="Gerar nova PSK"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Configurações Avançadas */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Configurações Avançadas</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Criptografia
                  </label>
                  <select
                    value={config.encryption}
                    onChange={(e) => setConfig(prev => ({ ...prev, encryption: e.target.value as any }))}
                    className="input"
                  >
                    {encryptionOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Autenticação
                  </label>
                  <select
                    value={config.authentication}
                    onChange={(e) => setConfig(prev => ({ ...prev, authentication: e.target.value as any }))}
                    className="input"
                  >
                    {authenticationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DH Group
                  </label>
                  <select
                    value={config.dhGroup}
                    onChange={(e) => setConfig(prev => ({ ...prev, dhGroup: e.target.value as any }))}
                    className="input"
                  >
                    {dhGroupOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IKE Version
                  </label>
                  <select
                    value={config.ikeVersion}
                    onChange={(e) => setConfig(prev => ({ ...prev, ikeVersion: e.target.value as any }))}
                    className="input"
                  >
                    <option value="ikev1">IKEv1</option>
                    <option value="ikev2">IKEv2 (Recomendado)</option>
                  </select>
                </div>
              </div>
            </div>

            <Button
              onClick={generateConfiguration}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4 mr-2" />
                  Gerar Configuração
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Configuração Gerada e Testes */}
        <div className="space-y-6">
          {/* Configuração Gerada */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold">Configuração Gerada</h2>
                </div>
                {generatedConfig && (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(generatedConfig)}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadConfig}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="card-body">
              {generatedConfig ? (
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>{generatedConfig}</pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Terminal className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p>Preencha os dados e clique em "Gerar Configuração"</p>
                </div>
              )}
            </div>
          </div>

          {/* Teste de Conectividade */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center space-x-2">
                <Network className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Teste de Conectividade</h2>
              </div>
            </div>
            
            <div className="card-body space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Teste a conectividade com o cliente após aplicar a configuração
                </p>
                <Button
                  variant="outline"
                  onClick={testConnectivity}
                  disabled={testResult.status === 'testing' || !config.clientIP || config.clientIP === 'dynamic'}
                >
                  {testResult.status === 'testing' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Testando...
                    </>
                  ) : config.clientIP === 'dynamic' ? (
                    <>
                      <Network className="w-4 h-4 mr-2" />
                      Teste (Apenas IP Fixo)
                    </>
                  ) : (
                    <>
                      <Network className="w-4 h-4 mr-2" />
                      Testar Conectividade
                    </>
                  )}
                </Button>
              </div>

              {testResult.status !== 'idle' && (
                <div className={`p-4 rounded-lg border ${
                  testResult.status === 'success' 
                    ? 'bg-green-50 border-green-200' 
                    : testResult.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    {getTestStatusIcon()}
                    <div className="flex-1">
                      <p className={`font-medium ${
                        testResult.status === 'success' 
                          ? 'text-green-800' 
                          : testResult.status === 'error'
                          ? 'text-red-800'
                          : 'text-blue-800'
                      }`}>
                        {testResult.message}
                      </p>
                      {testResult.details && (
                        <p className="text-sm text-gray-600 mt-1">
                          {testResult.details}
                        </p>
                      )}
                      {testResult.timestamp && (
                        <p className="text-xs text-gray-500 mt-2">
                          {testResult.timestamp}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Informações de Ajuda */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">Como Aplicar</h2>
              </div>
            </div>
            
            <div className="card-body">
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <p>Copie ou baixe a configuração gerada acima</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <p>Acesse o equipamento do cliente via SSH ou interface web</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <p>Cole/importe a configuração no equipamento</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <p>Execute o teste de conectividade para validar</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}