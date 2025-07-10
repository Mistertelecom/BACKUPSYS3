import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Upload, ArrowLeft, Server, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { equipamentosAPI, backupsAPI, providersAPI } from '../services/api';
import { Button } from '../components/ui/Button';
import { FileTypeInfo } from '../components/ui/FileTypeInfo';

interface Equipamento {
  id: number;
  nome: string;
  ip: string;
  tipo: string;
  created_at: string;
}

interface Provider {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
}

export function UploadBackupPage() {
  const { equipamentoId } = useParams<{ equipamentoId: string }>();
  const navigate = useNavigate();
  
  const [equipamento, setEquipamento] = useState<Equipamento | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showFileInfo, setShowFileInfo] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (equipamentoId) {
      fetchEquipamento();
      fetchProviders();
    }
  }, [equipamentoId]);

  const fetchEquipamento = async () => {
    try {
      const response = await equipamentosAPI.getById(parseInt(equipamentoId!));
      setEquipamento(response.data);
    } catch (error) {
      toast.error('Erro ao carregar equipamento');
      navigate('/equipamentos');
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await providersAPI.getActive();
      setProviders(response.data);
      
      // Selecionar o primeiro provider ativo por padrão
      if (response.data.length > 0) {
        setSelectedProvider(response.data[0].id);
      }
    } catch (error) {
      toast.error('Erro ao carregar provedores');
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !equipamento) return;

    setIsUploading(true);
    try {
      await backupsAPI.upload(equipamento.id, selectedFile, selectedProvider || undefined);
      toast.success('Backup enviado com sucesso!');
      navigate('/equipamentos');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao enviar backup';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!equipamento) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          onClick={() => navigate('/equipamentos')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Upload de Backup</h1>
          <p className="text-gray-600">Enviar arquivo de backup para o equipamento</p>
        </div>
      </div>

      {/* Equipment Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-center mb-4">
          <Server className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-xl font-semibold text-blue-900">Informações do Equipamento</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium text-blue-800">Nome:</span>
            <p className="text-gray-900 font-medium">{equipamento.nome}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-blue-800">IP:</span>
            <p className="text-gray-900 font-medium">{equipamento.ip}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-blue-800">Tipo:</span>
            <p className="text-gray-900 font-medium">{equipamento.tipo}</p>
          </div>
        </div>
      </div>

      {/* Provider Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Provedor de Armazenamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => (
            <label key={provider.id} className="cursor-pointer">
              <input
                type="radio"
                name="provider"
                value={provider.id}
                checked={selectedProvider === provider.id}
                onChange={() => setSelectedProvider(provider.id)}
                className="sr-only"
              />
              <div className={`p-4 rounded-lg border-2 transition-all ${
                selectedProvider === provider.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{provider.name}</span>
                  {selectedProvider === provider.id && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
                <span className="text-sm text-gray-600">{provider.type}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Selecionar Arquivo</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFileInfo(!showFileInfo)}
          >
            <FileText className="h-4 w-4 mr-2" />
            {showFileInfo ? 'Ocultar' : 'Ver'} Tipos Suportados
          </Button>
        </div>

        {showFileInfo && (
          <div className="mb-6">
            <FileTypeInfo selectedEquipmentType={equipamento.tipo} />
          </div>
        )}

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Tipo desconhecido'}
                </p>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedFile(null)}
                >
                  Trocar Arquivo
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  isLoading={isUploading}
                  className="flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>{isUploading ? 'Enviando...' : 'Enviar Backup'}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Upload className="h-12 w-12 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  Arraste e solte o arquivo aqui
                </p>
                <p className="text-sm text-gray-600">ou clique para selecionar</p>
              </div>
              <div className="flex items-center justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    accept=".rsc,.export,.backup,.cfg,.json,.unf,.dat,.zip,.tar,.xml,.db,.bak,.tar.gz"
                  />
                  <Button variant="outline">
                    Selecionar Arquivo
                  </Button>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Importante
            </p>
            <p className="text-sm text-yellow-700">
              Certifique-se de que o arquivo é compatível com o tipo de equipamento selecionado. 
              O sistema validará automaticamente a compatibilidade durante o upload.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}