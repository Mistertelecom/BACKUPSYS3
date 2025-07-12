import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { api, providersAPI } from '../../services/api';

interface Provider {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
}

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  backup: {
    id: number;
    nome_arquivo: string;
    caminho: string;
    equipamento_id: number;
    sync_status?: string;
    last_sync_date?: string;
    sync_provider_id?: number;
  };
  onSyncComplete: () => void;
}

export function CloudSyncModal({ isOpen, onClose, backup, onSyncComplete }: CloudSyncModalProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  const loadProviders = async () => {
    try {
      setIsLoading(true);
      const response = await providersAPI.getActive();
      const activeProviders = response.data.filter((p: Provider) => 
        p.type !== 'local' && p.is_active
      );
      setProviders(activeProviders);
      
      // Se o backup já foi sincronizado, selecionar o provider usado
      if (backup.sync_provider_id) {
        setSelectedProviderId(backup.sync_provider_id);
      }
    } catch (error) {
      console.error('Erro ao carregar providers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedProviderId) return;

    try {
      setIsSyncing(true);
      setSyncStatus('uploading');
      setErrorMessage('');

      const response = await api.post(`/backups/${backup.id}/sync`, {
        provider_id: selectedProviderId
      });

      if (response.data.success) {
        setSyncStatus('success');
        setTimeout(() => {
          onSyncComplete();
          onClose();
        }, 2000);
      } else {
        setSyncStatus('error');
        setErrorMessage(response.data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      setSyncStatus('error');
      setErrorMessage(error.response?.data?.error || 'Erro ao sincronizar backup');
      console.error('Erro ao sincronizar backup:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'uploading':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Upload className="w-5 h-5" />;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'uploading':
        return 'Sincronizando...';
      case 'success':
        return 'Sincronizado com sucesso!';
      case 'error':
        return 'Erro na sincronização';
      default:
        return 'Sincronizar com a nuvem';
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'dropbox':
        return '📦';
      case 'google-drive':
        return '💾';
      case 'aws-s3':
        return '🌐';
      case 'gcs':
        return '☁️';
      default:
        return '📁';
    }
  };

  const formatLastSync = (dateString?: string) => {
    if (!dateString) return 'Nunca sincronizado';
    const date = new Date(dateString);
    return `Última sync: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Sincronizar Backup
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSyncing}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Arquivo:</p>
          <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">
            {backup.nome_arquivo}
          </p>
        </div>

        {backup.sync_status && backup.sync_status !== 'not_synced' && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Status atual: <span className="font-medium capitalize">{backup.sync_status}</span>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {formatLastSync(backup.last_sync_date)}
            </p>
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Selecione o provider de nuvem:
          </label>
          
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Carregando providers...</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                Nenhum provider de nuvem configurado.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Configure providers na seção de Providers.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedProviderId === provider.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedProviderId(provider.id)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getProviderIcon(provider.type)}</span>
                    <div>
                      <p className="font-medium text-gray-900">{provider.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{provider.type}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSync}
            disabled={!selectedProviderId || isSyncing || providers.length === 0}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {getSyncStatusIcon()}
            <span>{getSyncStatusText()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}