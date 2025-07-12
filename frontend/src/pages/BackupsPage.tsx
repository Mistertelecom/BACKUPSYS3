import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Search, Download, Trash2, HardDrive, Filter, BarChart3, FileText } from 'lucide-react';
import { backupsAPI } from '../services/api';
import { Button } from '../components/ui/Button';
import { BackupStats } from '../components/dashboard/BackupStats';
import { UsageReport } from '../components/reports/UsageReport';

interface Backup {
  id: number;
  equipamento_id: number;
  nome_arquivo: string;
  caminho: string;
  data_upload: string;
  equipamento_nome: string;
  equipamento_ip: string;
  equipamento_tipo: string;
}

export function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [filteredBackups, setFilteredBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showUsageReport, setShowUsageReport] = useState(false);

  const fetchBackups = async () => {
    try {
      setIsLoading(true);
      const response = await backupsAPI.getAll();
      setBackups(response.data);
      setFilteredBackups(response.data);
    } catch (error) {
      toast.error('Erro ao carregar backups');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  useEffect(() => {
    let filtered = backups;

    if (searchTerm) {
      filtered = filtered.filter(backup =>
        backup.nome_arquivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        backup.equipamento_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        backup.equipamento_ip.includes(searchTerm)
      );
    }

    if (filterType) {
      filtered = filtered.filter(backup =>
        backup.equipamento_tipo.toLowerCase().includes(filterType.toLowerCase())
      );
    }

    setFilteredBackups(filtered);
  }, [searchTerm, filterType, backups]);

  const handleDownload = async (backupId: number, filename: string) => {
    try {
      const response = await backupsAPI.download(backupId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download iniciado!');
    } catch (error) {
      toast.error('Erro ao fazer download');
    }
  };

  const handleDelete = async (backupId: number, filename: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o backup "${filename}"?`)) {
      try {
        await backupsAPI.delete(backupId);
        toast.success('Backup excluído com sucesso!');
        fetchBackups();
      } catch (error) {
        toast.error('Erro ao excluir backup');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getUniqueTypes = () => {
    const types = [...new Set(backups.map(backup => backup.equipamento_tipo))];
    return types.sort();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Backups</h1>
        <div className="flex items-center space-x-4">
          <Button
            variant={showStats ? "default" : "outline"}
            onClick={() => {
              setShowStats(!showStats);
              if (showUsageReport) setShowUsageReport(false);
            }}
            className="flex items-center space-x-2"
          >
            <BarChart3 className="h-4 w-4" />
            <span>{showStats ? 'Ocultar' : 'Mostrar'} Estatísticas</span>
          </Button>
          
          <Button
            variant={showUsageReport ? "default" : "outline"}
            onClick={() => {
              setShowUsageReport(!showUsageReport);
              if (showStats) setShowStats(false);
            }}
            className="flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>{showUsageReport ? 'Ocultar' : 'Relatório'} de Uso</span>
          </Button>
          
          <div className="text-sm text-gray-500">
            {filteredBackups.length} backup(s) encontrado(s)
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome do arquivo ou equipamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
        
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="input pl-10 pr-8"
          >
            <option value="">Todos os tipos</option>
            {getUniqueTypes().map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setSearchTerm('');
            setFilterType('');
          }}
          disabled={!searchTerm && !filterType}
        >
          Limpar Filtros
        </Button>
      </div>

      {/* Dashboard de Estatísticas */}
      {showStats && (
        <BackupStats backups={backups} />
      )}

      {/* Relatório de Uso */}
      {showUsageReport && (
        <UsageReport backups={backups} />
      )}

      {filteredBackups.length === 0 ? (
        <div className="text-center py-12">
          <HardDrive className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterType ? 'Nenhum backup encontrado' : 'Nenhum backup disponível'}
          </h3>
          <p className="text-gray-500">
            {searchTerm || filterType 
              ? 'Tente ajustar sua busca ou filtros'
              : 'Os backups aparecerão aqui após serem enviados'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBackups.map((backup) => (
            <div key={backup.id} className="card hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <HardDrive className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{backup.nome_arquivo}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>
                          <strong>Equipamento:</strong> {backup.equipamento_nome}
                        </span>
                        <span>
                          <strong>IP:</strong> {backup.equipamento_ip}
                        </span>
                        <span>
                          <strong>Tipo:</strong> {backup.equipamento_tipo}
                        </span>
                        <span>
                          <strong>Data:</strong> {formatDate(backup.data_upload)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(backup.id, backup.nome_arquivo)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <button
                      onClick={() => handleDelete(backup.id, backup.nome_arquivo)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}