import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Server, Edit, Trash2, Upload, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { FileUploader } from '../ui/FileUploader';
import { backupsAPI } from '../../services/api';

interface Equipamento {
  id: number;
  nome: string;
  ip: string;
  tipo: string;
  created_at: string;
  backup_count: number;
}

interface EquipamentoCardProps {
  equipamento: Equipamento;
  onEdit: (equipamento: Equipamento) => void;
  onDelete: (id: number) => void;
  onViewBackups: (equipamento: Equipamento) => void;
}

export function EquipamentoCard({ equipamento, onEdit, onDelete, onViewBackups }: EquipamentoCardProps) {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo para upload');
      return;
    }

    setIsUploading(true);
    try {
      await backupsAPI.upload(equipamento.id, selectedFile);
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
      <div className="card hover:shadow-lg transition-shadow">
        <div className="card-body">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Server className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{equipamento.nome}</h3>
                <p className="text-sm text-gray-500">{equipamento.tipo}</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <button
                onClick={() => onEdit(equipamento)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                title="Editar"
              >
                <Edit className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-red-100 rounded-full transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">IP:</span>
              <span className="font-medium">{equipamento.ip}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Backups:</span>
              <span className="font-medium">{equipamento.backup_count}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Criado em:</span>
              <span className="font-medium">{formatDate(equipamento.created_at)}</span>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUploadModal(true)}
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
        </div>
      </div>

      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={`Upload de Backup - ${equipamento.nome}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p><strong>Equipamento:</strong> {equipamento.nome}</p>
            <p><strong>IP:</strong> {equipamento.ip}</p>
            <p><strong>Tipo:</strong> {equipamento.tipo}</p>
          </div>

          <FileUploader
            selectedFile={selectedFile}
            onFileSelect={setSelectedFile}
            onFileRemove={() => setSelectedFile(null)}
          />

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
    </>
  );
}