import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Search, Download, Trash2, HardDrive, Filter, BarChart3, FileText, Clock, Shield, Server, Calendar, FileArchive, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { backupsAPI } from '../services/api';
import { Button } from '../components/ui/Button';
import { BackupStats } from '../components/dashboard/BackupStats';
import { UsageReport } from '../components/reports/UsageReport';
import { BackupTimeline } from '../components/analysis/BackupTimeline';
import { IntegrityChecker } from '../components/integrity/IntegrityChecker';
import { formatFileSize, formatDate, getRelativeTime } from '../utils/cn';

interface Backup {
  id: number;
  equipamento_id: number;
  nome_arquivo: string;
  caminho: string;
  data_upload: string;
  equipamento_nome: string;
  equipamento_ip: string;
  equipamento_tipo: string;
  file_size?: number;
  status?: string;
  sync_status?: string;
}

export function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [filteredBackups, setFilteredBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showUsageReport, setShowUsageReport] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showIntegrityChecker, setShowIntegrityChecker] = useState(false);
  const [showDetails, setShowDetails] = useState(() => {
    // Carregar preferência salva do localStorage
    const saved = localStorage.getItem('backups-show-details');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

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

  const getFileExtensionIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'zip':
      case 'tar':
      case 'gz':
      case 'tgz':
        return <FileArchive className="h-5 w-5 text-blue-600" />;
      case 'sql':
      case 'db':
        return <Server className="h-5 w-5 text-green-600" />;
      default:
        return <HardDrive className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (backup: Backup) => {
    if (backup.sync_status === 'synced') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Sincronizado
        </span>
      );
    }
    if (backup.sync_status === 'syncing') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Sincronizando
        </span>
      );
    }
    if (backup.status === 'active') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Local
        </span>
      );
    }
    return null;
  };

  const toggleCardExpansion = (backupId: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(backupId)) {
      newExpanded.delete(backupId);
    } else {
      newExpanded.add(backupId);
    }
    setExpandedCards(newExpanded);
  };

  const toggleShowDetails = () => {
    const newShowDetails = !showDetails;
    setShowDetails(newShowDetails);
    // Salvar preferência no localStorage
    localStorage.setItem('backups-show-details', JSON.stringify(newShowDetails));
    // Limpar cards expandidos quando mudar para modo com detalhes
    if (newShowDetails) {
      setExpandedCards(new Set());
    }
    // Feedback visual de que a preferência foi salva
    toast.success(
      newShowDetails 
        ? 'Detalhes ativados e salvos!' 
        : 'Modo compacto ativado e salvo!',
      { duration: 2000, position: 'bottom-right' }
    );
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Button
              variant={showDetails ? "default" : "outline"}
              size="sm"
              onClick={toggleShowDetails}
              className="flex items-center space-x-2"
              title={showDetails ? 'Ocultar detalhes dos backups\nPreferência será salva automaticamente' : 'Mostrar detalhes dos backups\nPreferência será salva automaticamente'}
            >
              {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden sm:inline">{showDetails ? 'Ocultar' : 'Mostrar'} Detalhes</span>
              <span className="sm:hidden">Detalhes</span>
              <span className="hidden lg:inline text-xs opacity-60 ml-1">• Salvo</span>
            </Button>
          
            <Button
              variant={showStats ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowStats(!showStats);
                if (showUsageReport) setShowUsageReport(false);
                if (showTimeline) setShowTimeline(false);
                if (showIntegrityChecker) setShowIntegrityChecker(false);
              }}
              className="flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{showStats ? 'Ocultar' : 'Mostrar'} Estatísticas</span>
              <span className="sm:hidden">Stats</span>
            </Button>
            
            <Button
              variant={showUsageReport ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowUsageReport(!showUsageReport);
                if (showStats) setShowStats(false);
                if (showTimeline) setShowTimeline(false);
                if (showIntegrityChecker) setShowIntegrityChecker(false);
              }}
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{showUsageReport ? 'Ocultar' : 'Relatório'} de Uso</span>
              <span className="sm:hidden">Relatório</span>
            </Button>

            <Button
              variant={showTimeline ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowTimeline(!showTimeline);
                if (showStats) setShowStats(false);
                if (showUsageReport) setShowUsageReport(false);
                if (showIntegrityChecker) setShowIntegrityChecker(false);
              }}
              className="flex items-center space-x-2"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">{showTimeline ? 'Ocultar' : 'Timeline'}</span>
              <span className="sm:hidden">Timeline</span>
            </Button>

            <Button
              variant={showIntegrityChecker ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setShowIntegrityChecker(!showIntegrityChecker);
                if (showStats) setShowStats(false);
                if (showUsageReport) setShowUsageReport(false);
                if (showTimeline) setShowTimeline(false);
              }}
              className="flex items-center space-x-2"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{showIntegrityChecker ? 'Ocultar' : 'Integridade'}</span>
              <span className="sm:hidden">Integridade</span>
            </Button>
          </div>
          
          <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
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

      {/* Timeline de Backups */}
      {showTimeline && (
        <BackupTimeline backups={backups} />
      )}

      {/* Verificação de Integridade */}
      {showIntegrityChecker && (
        <IntegrityChecker backups={backups} />
      )}

      {filteredBackups.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 max-w-md mx-auto">
            <div className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-sm">
              <HardDrive className="h-12 w-12 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {searchTerm || filterType ? 'Nenhum backup encontrado' : 'Nenhum backup disponível'}
            </h3>
            <p className="text-gray-600">
              {searchTerm || filterType 
                ? 'Tente ajustar sua busca ou limpar os filtros para ver mais resultados'
                : 'Os backups dos seus equipamentos aparecerão aqui após serem enviados'
              }
            </p>
            {(searchTerm || filterType) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('');
                  setExpandedCards(new Set()); // Reset expanded cards when clearing filters
                }}
                className="mt-4"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBackups.map((backup) => {
            const isExpanded = expandedCards.has(backup.id);
            const shouldShowDetails = showDetails || isExpanded;
            
            return (
              <div key={backup.id} className="card hover-lift group">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="icon-container bg-gray-100">
                        {getFileExtensionIcon(backup.nome_arquivo)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-gray-800 transition-colors">
                            {backup.nome_arquivo}
                          </h3>
                          {getStatusBadge(backup)}
                          
                          {!showDetails && (
                            <button
                              onClick={() => toggleCardExpansion(backup.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                              title={isExpanded ? 'Ocultar detalhes' : 'Mostrar detalhes'}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                        
                        {shouldShowDetails && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <Server className="h-4 w-4 text-gray-400" />
                                <div>
                                  <span className="text-gray-500">Equipamento:</span>
                                  <p className="font-medium text-gray-900">{backup.equipamento_nome}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                                <div>
                                  <span className="text-gray-500">IP:</span>
                                  <p className="font-medium text-gray-900 font-mono">{backup.equipamento_ip}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-purple-100 rounded flex items-center justify-center">
                                  <div className="w-2 h-2 bg-purple-500 rounded"></div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Tipo:</span>
                                  <p className="font-medium text-gray-900">{backup.equipamento_tipo}</p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <div>
                                  <span className="text-gray-500">Upload:</span>
                                  <p className="font-medium text-gray-900" title={formatDate(backup.data_upload)}>
                                    {getRelativeTime(backup.data_upload)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {backup.file_size && (
                              <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
                                <HardDrive className="h-4 w-4" />
                                <span>Tamanho: <span className="font-medium">{formatFileSize(backup.file_size)}</span></span>
                              </div>
                            )}
                          </>
                        )}
                        
                        {!shouldShowDetails && (
                          <div className="text-sm text-gray-500">
                            {backup.equipamento_nome} • {getRelativeTime(backup.data_upload)}
                            {backup.file_size && ` • ${formatFileSize(backup.file_size)}`}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(backup.id, backup.nome_arquivo)}
                        className="opacity-70 group-hover:opacity-100 transition-opacity"
                        title="Fazer download do backup"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Download</span>
                      </Button>
                      <button
                        onClick={() => handleDelete(backup.id, backup.nome_arquivo)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                        title="Excluir backup"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}