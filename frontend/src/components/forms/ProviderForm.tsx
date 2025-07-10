import React, { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { Provider, ProviderConfig, PROVIDER_TYPES, AWS_REGIONS } from '../../types/provider';
import { providersAPI } from '../../services/api';
import { Button } from '../ui/Button';
import { InputField } from '../ui/InputField';
import toast from 'react-hot-toast';

interface ProviderFormProps {
  provider?: Provider;
  onClose: () => void;
  onSave: (provider: Provider) => void;
}

export const ProviderForm: React.FC<ProviderFormProps> = ({
  provider,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'local' as Provider['type'],
    config: {} as ProviderConfig,
    is_active: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (provider) {
      setFormData({
        name: provider.name,
        type: provider.type,
        config: JSON.parse(provider.config),
        is_active: provider.is_active
      });
    }
  }, [provider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const payload = {
        ...formData,
        config: formData.config
      };

      let response;
      if (provider) {
        response = await providersAPI.update(provider.id, payload);
      } else {
        response = await providersAPI.create(payload);
      }

      onSave(response.data);
      toast.success(`Provider ${provider ? 'atualizado' : 'criado'} com sucesso!`);
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar provider:', error);
      if (error.response?.data?.errors) {
        const errorObj: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          errorObj[err.path] = err.msg;
        });
        setErrors(errorObj);
      } else {
        toast.error(error.response?.data?.error || 'Erro ao salvar provider');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!provider) {
      toast.error('Salve o provider primeiro para testar a conexão');
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await providersAPI.testConnection(provider.id);
      if (response.data.success) {
        toast.success('Conexão testada com sucesso!');
      } else {
        toast.error('Falha na conexão com o provider');
      }
    } catch (error: any) {
      console.error('Erro ao testar conexão:', error);
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const updateConfig = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };

  const renderConfigForm = () => {
    switch (formData.type) {
      case 'local':
        return (
          <div className="space-y-4">
            <InputField
              label="Caminho de Armazenamento"
              value={formData.config.path || ''}
              onChange={(e) => updateConfig('path', e.target.value)}
              placeholder="/uploads"
              error={errors.path}
            />
          </div>
        );

      case 'aws-s3':
        return (
          <div className="space-y-4">
            <InputField
              label="Nome do Bucket"
              value={formData.config.bucket || ''}
              onChange={(e) => updateConfig('bucket', e.target.value)}
              placeholder="meu-bucket-backup"
              error={errors.bucket}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Região
                </label>
                <select
                  value={formData.config.region || 'us-east-1'}
                  onChange={(e) => updateConfig('region', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {AWS_REGIONS.map(region => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
              <InputField
                label="Endpoint (opcional)"
                value={formData.config.endpoint || ''}
                onChange={(e) => updateConfig('endpoint', e.target.value)}
                placeholder="https://s3.amazonaws.com"
              />
            </div>
            <InputField
              label="Access Key ID"
              value={formData.config.accessKeyId || ''}
              onChange={(e) => updateConfig('accessKeyId', e.target.value)}
              placeholder="AKIAIOSFODNN7EXAMPLE"
              error={errors.accessKeyId}
              required
            />
            <InputField
              label="Secret Access Key"
              type="password"
              value={formData.config.secretAccessKey || ''}
              onChange={(e) => updateConfig('secretAccessKey', e.target.value)}
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              error={errors.secretAccessKey}
              required
            />
          </div>
        );

      case 'gcs':
        return (
          <div className="space-y-4">
            <InputField
              label="Nome do Bucket"
              value={formData.config.bucket || ''}
              onChange={(e) => updateConfig('bucket', e.target.value)}
              placeholder="meu-bucket-backup"
              error={errors.bucket}
              required
            />
            <InputField
              label="Project ID"
              value={formData.config.projectId || ''}
              onChange={(e) => updateConfig('projectId', e.target.value)}
              placeholder="meu-projeto-123"
              error={errors.projectId}
              required
            />
            <InputField
              label="Caminho do Arquivo de Chave"
              value={formData.config.keyFilename || ''}
              onChange={(e) => updateConfig('keyFilename', e.target.value)}
              placeholder="/path/to/service-account-key.json"
              helperText="Ou forneça as credenciais diretamente"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credenciais JSON (opcional)
              </label>
              <textarea
                value={formData.config.credentials ? JSON.stringify(formData.config.credentials, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const credentials = e.target.value ? JSON.parse(e.target.value) : null;
                    updateConfig('credentials', credentials);
                  } catch (error) {
                    // Invalid JSON, keep as is
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                placeholder='{"type": "service_account", "project_id": "...", ...}'
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold">
            {provider ? 'Editar Provider' : 'Novo Provider'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Nome do Provider"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Meu Provider AWS"
              error={errors.name}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Provider
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  type: e.target.value as Provider['type'],
                  config: {} // Reset config when type changes
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!!provider} // Don't allow type change for existing providers
              >
                {Object.entries(PROVIDER_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Provider Ativo
            </label>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Configuração do Provider</h3>
            {renderConfigForm()}
          </div>

          </div>
          <div className="flex items-center justify-between p-6 border-t flex-shrink-0 bg-gray-50">
            <div className="flex space-x-3">
              {provider && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="flex items-center space-x-2"
                >
                  {isTestingConnection ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>Testar Conexão</span>
                </Button>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                <span>{provider ? 'Atualizar' : 'Criar'}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};