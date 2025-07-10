import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Server, Edit, Trash2, Upload, Eye, Cloud, HardDrive, ExternalLink, Cog } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { FileUploader } from '../ui/FileUploader';
import { AutoBackupConfigModal } from '../modals/AutoBackupConfigModal';
import { backupsAPI, providersAPI } from '../../services/api';

interface Equipamento {
  id: number;
  nome: string;
  ip: string;
  tipo: string;
  created_at: string;
  backup_count: number;
  ssh_enabled?: boolean;
  ssh_port?: number;
  ssh_username?: string;
  ssh_password?: string;
  ssh_private_key?: string;
  auto_backup_enabled?: boolean;
  auto_backup_schedule?: string;
}

interface Provider {
  id: number;
  nome: string;
  tipo: string;
  ativo: boolean;
  configuracao: any;
}

interface EquipamentoCardProps {
  equipamento: Equipamento;
  onEdit: (equipamento: Equipamento) => void;
  onDelete: (id: number) => void;
  onViewBackups: (equipamento: Equipamento) => void;
}

export function EquipamentoCard({ equipamento, onEdit, onDelete, onViewBackups }: EquipamentoCardProps) {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [currentEquipamento, setCurrentEquipamento] = useState<Equipamento>(equipamento);

  const fetchProviders = async () => {
    setIsLoadingProviders(true);
    try {
      const response = await providersAPI.getActive();
      setProviders(response.data);
      
      // Set default provider (local provider or first active provider)
      const localProvider = response.data.find((p: Provider) => p.tipo === 'local');
      if (localProvider) {
        setSelectedProvider(localProvider.id);
      } else if (response.data.length > 0) {
        setSelectedProvider(response.data[0].id);
      }
    } catch (error: any) {
      console.error('Erro ao carregar provedores:', error);
      // If providers fail to load, still allow upload with null provider (will use default/local)
      toast.error('Erro ao carregar provedores de storage. Será usado o provedor padrão.');
      setProviders([]);
      setSelectedProvider(null);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo para upload');
      return;
    }

    setIsUploading(true);
    try {
      await backupsAPI.upload(equipamento.id, selectedFile, selectedProvider || undefined);
      toast.success('Backup enviado com sucesso!');
      setShowUploadModal(false);
      setSelectedFile(null);
      
      window.location.reload();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao enviar backup';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenUploadModal = () => {
    setShowUploadModal(true);
    fetchProviders();
  };

  const getProviderIcon = (tipo: string) => {
    switch (tipo) {
      case 'local':
        return <HardDrive className="h-4 w-4" />;
      case 'aws':
      case 'gcp':
      case 'azure':
        return <Cloud className="h-4 w-4" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  const getProviderTypeLabel = (tipo: string) => {
    switch (tipo) {
      case 'local':
        return 'Armazenamento Local';
      case 'aws':
        return 'Amazon S3';
      case 'gcp':
        return 'Google Cloud Storage';
      case 'azure':
        return 'Azure Blob Storage';
      default:
        return tipo;
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o equipamento "${equipamento.nome}"?`)) {
      onDelete(equipamento.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <>
      <div className="card hover:shadow-lg transition-all duration-300 group">
        <div className="card-body">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3 flex-1">
              <div className="icon-container bg-blue-100 group-hover:bg-blue-200 transition-colors">
                <Server className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">{equipamento.nome}</h3>
                <p className="text-sm text-gray-600 font-medium">{equipamento.tipo}</p>
              </div>
            </div>
            <div className="flex space-x-1 ml-2">
              <button
                onClick={() => onEdit(equipamento)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
                title="Editar"
              >
                <Edit className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 hover:bg-red-100 rounded-xl transition-all duration-200"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">IP:</span>
              <span className="text-sm font-semibold text-gray-900">{equipamento.ip}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Backups:</span>
              <span className="text-sm font-semibold text-gray-900">{equipamento.backup_count}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-gray-600">Criado em:</span>
              <span className="text-sm font-semibold text-gray-900">{formatDate(equipamento.created_at)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenUploadModal}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewBackups(equipamento)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Backups
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/equipamentos/${equipamento.id}/upload`)}
                className="flex-1"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Upload Avançado
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAutoBackupModal(true)}
                className={`flex-1 ${currentEquipamento.auto_backup_enabled ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
              >
                <Cog className="h-4 w-4 mr-2" />
                Auto Backup
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={`Upload de Backup - ${equipamento.nome}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold text-blue-800">Equipamento:</span>
                <p className="text-gray-900 mt-1">{equipamento.nome}</p>
              </div>
              <div>
                <span className="font-semibold text-blue-800">IP:</span>
                <p className="text-gray-900 mt-1">{equipamento.ip}</p>
              </div>
              <div>
                <span className="font-semibold text-blue-800">Tipo:</span>
                <p className="text-gray-900 mt-1">{equipamento.tipo}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provedor de Armazenamento
              </label>
              {isLoadingProviders ? (
                <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
              ) : (
                <div className="space-y-2">
                  {providers.map((provider) => (
                    <label key={provider.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="provider"
                        value={provider.id}
                        checked={selectedProvider === provider.id}
                        onChange={(e) => setSelectedProvider(parseInt(e.target.value))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-2">
                        {getProviderIcon(provider.tipo)}
                        <div>
                          <div className="font-medium text-gray-900">{provider.nome}</div>
                          <div className="text-sm text-gray-500">{getProviderTypeLabel(provider.tipo)}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                  {providers.length === 0 && !isLoadingProviders && (
                    <div className="text-center py-4 text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center justify-center space-x-2">
                        <HardDrive className="h-4 w-4 text-yellow-600" />
                        <span>Nenhum provedor ativo encontrado. Será usado o provedor padrão.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Arquivo de Backup
              </label>
              <FileUploader
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                onFileRemove={() => setSelectedFile(null)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowUploadModal(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              isLoading={isUploading}
              disabled={!selectedFile || isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Enviando...' : 'Enviar Backup'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Auto Backup Configuration Modal */}
      <AutoBackupConfigModal
        isOpen={showAutoBackupModal}
        onClose={() => setShowAutoBackupModal(false)}
        equipamento={currentEquipamento}
        onSave={(updatedEquipamento) => {
          setCurrentEquipamento({
            ...currentEquipamento,
            ...updatedEquipamento
          });
          setShowAutoBackupModal(false);
        }}
      />
    </>
  );
}