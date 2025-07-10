import React, { useState } from 'react';
import { 
  Cloud, 
  HardDrive, 
  Settings, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Provider, PROVIDER_TYPES } from '../../types/provider';
import { providersAPI } from '../../services/api';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

interface ProviderCardProps {
  provider: Provider;
  onEdit: (provider: Provider) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number) => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  onEdit,
  onDelete,
  onToggleActive
}) => {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);

    try {
      const response = await providersAPI.testConnection(provider.id);
      if (response.data.success) {
        setConnectionStatus('success');
        toast.success('Conexão testada com sucesso!');
      } else {
        setConnectionStatus('error');
        toast.error('Falha na conexão com o provider');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('Erro ao testar conexão');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      await providersAPI.toggleActive(provider.id);
      onToggleActive(provider.id);
      toast.success(`Provider ${provider.is_active ? 'desativado' : 'ativado'} com sucesso!`);
    } catch (error: any) {
      toast.error('Erro ao alterar status do provider');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja deletar este provider?')) {
      try {
        await providersAPI.delete(provider.id);
        onDelete(provider.id);
        toast.success('Provider deletado com sucesso!');
      } catch (error: any) {
        toast.error('Erro ao deletar provider');
      }
    }
  };

  const getProviderIcon = () => {
    switch (provider.type) {
      case 'aws-s3':
        return <Cloud className="text-orange-500" size={24} />;
      case 'gcs':
        return <Cloud className="text-blue-500" size={24} />;
      case 'local':
      default:
        return <HardDrive className="text-gray-500" size={24} />;
    }
  };

  const getProviderConfig = () => {
    try {
      const config = JSON.parse(provider.config);
      switch (provider.type) {
        case 'aws-s3':
          return `Bucket: ${config.bucket || 'N/A'} | Region: ${config.region || 'N/A'}`;
        case 'gcs':
          return `Bucket: ${config.bucket || 'N/A'} | Project: ${config.projectId || 'N/A'}`;
        case 'local':
        default:
          return `Path: ${config.path || 'N/A'}`;
      }
    } catch (error) {
      return 'Configuração inválida';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getProviderIcon()}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
            <p className="text-sm text-gray-500">{PROVIDER_TYPES[provider.type]}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            provider.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {provider.is_active ? 'Ativo' : 'Inativo'}
          </div>
          {connectionStatus && (
            <div className={`p-1 rounded-full ${
              connectionStatus === 'success' ? 'text-green-500' : 'text-red-500'
            }`}>
              {connectionStatus === 'success' ? (
                <CheckCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Configuração:</p>
        <p className="text-sm font-mono text-gray-800 bg-gray-50 p-2 rounded border">
          {getProviderConfig()}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="flex items-center space-x-1"
          >
            {isTestingConnection ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <CheckCircle size={14} />
            )}
            <span>Testar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(provider)}
            className="flex items-center space-x-1"
          >
            <Settings size={14} />
            <span>Editar</span>
          </Button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleToggleActive}
            className={`p-2 rounded-md transition-colors ${
              provider.is_active
                ? 'text-green-600 hover:bg-green-50'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
            title={provider.is_active ? 'Desativar' : 'Ativar'}
          >
            {provider.is_active ? (
              <ToggleRight size={20} />
            ) : (
              <ToggleLeft size={20} />
            )}
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Deletar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t text-xs text-gray-500">
        Criado em: {new Date(provider.created_at).toLocaleString('pt-BR')}
      </div>
    </div>
  );
};