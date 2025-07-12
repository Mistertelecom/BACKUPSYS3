import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Search, Server, Cloud, Upload, Filter, Grid, List, Wifi, Shield, Router, Database, Activity, Calendar, Users, HardDrive, TrendingUp, AlertCircle, CheckCircle, Clock, Eye, Edit, Trash2, ExternalLink, Cog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { equipamentosAPI, backupsAPI } from '../services/api';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EquipamentoForm } from '../components/forms/EquipamentoForm';
import { EquipamentoCard } from '../components/cards/EquipamentoCard';
import { CloudSyncModal } from '../components/modals/CloudSyncModal';
import { AutoBackupConfigModal } from '../components/modals/AutoBackupConfigModal';
import { formatFileSize, formatDate, getRelativeTime } from '../utils/cn';

interface Equipamento {
  id: number;
  nome: string;
  ip: string;
  tipo: string;
  created_at: string;
  backup_count: number;
}

interface EquipamentoFormData {
  nome: string;
  ip: string;
  tipo: string;
}

export function EquipamentosPage() {
  const navigate = useNavigate();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [filteredEquipamentos, setFilteredEquipamentos] = useState<Equipamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null);
  const [showBackupsModal, setShowBackupsModal] = useState(false);
  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null);
  const [equipamentoBackups, setEquipamentoBackups] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<any>(null);
  const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);
  const [selectedEquipamentoForAutoBackup, setSelectedEquipamentoForAutoBackup] = useState<Equipamento | null>(null);

  const fetchEquipamentos = async () => {
    try {
      setIsLoading(true);
      const response = await equipamentosAPI.getAll();
      setEquipamentos(response.data);
      setFilteredEquipamentos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar equipamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEquipamentoBackups = async (equipamentoId: number) => {
    try {
      const response = await equipamentosAPI.getBackups(equipamentoId);
      setEquipamentoBackups(response.data);
    } catch (error) {
      toast.error('Erro ao carregar backups do equipamento');
    }
  };

  useEffect(() => {
    fetchEquipamentos();
  }, []);

  useEffect(() => {
    let filtered = equipamentos;
    
    if (searchTerm) {
      filtered = filtered.filter(eq =>
        eq.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.ip.includes(searchTerm) ||
        eq.tipo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType) {
      filtered = filtered.filter(eq => 
        eq.tipo.toLowerCase().includes(filterType.toLowerCase())
      );
    }
    
    setFilteredEquipamentos(filtered);
  }, [searchTerm, filterType, equipamentos]);
  
  const getUniqueTypes = () => {
    const types = [...new Set(equipamentos.map(eq => eq.tipo))];
    return types.sort();
  };

  const handleCreate = async (data: EquipamentoFormData) => {
    setIsSubmitting(true);
    try {
      await equipamentosAPI.create(data);
      toast.success('Equipamento criado com sucesso!');
      setShowCreateModal(false);
      fetchEquipamentos();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao criar equipamento';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (equipamento: Equipamento) => {
    setEditingEquipamento(equipamento);
    setShowEditModal(true);
  };

  const handleUpdate = async (data: EquipamentoFormData) => {
    if (!editingEquipamento) return;

    setIsSubmitting(true);
    try {
      await equipamentosAPI.update(editingEquipamento.id, data);
      toast.success('Equipamento atualizado com sucesso!');
      setShowEditModal(false);
      setEditingEquipamento(null);
      fetchEquipamentos();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao atualizar equipamento';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await equipamentosAPI.delete(id);
      toast.success('Equipamento excluído com sucesso!');
      fetchEquipamentos();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao excluir equipamento';
      toast.error(errorMessage);
    }
  };

  const handleViewBackups = async (equipamento: Equipamento) => {
    setSelectedEquipamento(equipamento);
    setShowBackupsModal(true);
    await fetchEquipamentoBackups(equipamento.id);
  };

  const getEquipmentTypeIcon = (tipo: string) => {
    const typeIcons: { [key: string]: { icon: any } } = {
      'router': { icon: Router },
      'switch': { icon: Wifi },
      'servidor': { icon: Server },
      'firewall': { icon: Shield },
      'access point': { icon: Wifi },
      'balanceador': { icon: Activity },
    };
    
    const typeKey = tipo.toLowerCase();
    const config = typeIcons[typeKey] || { icon: Server };
    const IconComponent = config.icon;
    
    return (
      <div className="icon-container bg-gray-100 hover:bg-gray-200 transition-colors">
        <IconComponent className="h-5 w-5 text-gray-700" />
      </div>
    );
  };
  
  const getBackupStatusInfo = (count: number) => {
    if (count === 0) {
      return { 
        status: 'sem-backup',
        icon: AlertCircle,
        color: 'text-gray-600',
        badge: 'badge-error',
        text: 'Sem backups'
      };
    } else if (count < 5) {
      return { 
        status: 'poucos-backups',
        icon: Clock,
        color: 'text-gray-600',
        badge: 'badge-warning',
        text: `${count} backup${count > 1 ? 's' : ''}`
      };
    } else {
      return { 
        status: 'backup-ok',
        icon: CheckCircle,
        color: 'text-gray-600',
        badge: 'badge-success',
        text: `${count} backups`
      };
    }
  };

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
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao fazer download';
      toast.error(errorMessage);
    }
  };

  const handleCloudSync = (backup: any) => {
    setSelectedBackup(backup);
    setShowCloudSyncModal(true);
  };

  const handleSyncComplete = () => {
    // Recarregar backups para mostrar status atualizado
    if (selectedEquipamento) {
      fetchEquipamentoBackups(selectedEquipamento.id);
    }
  };

  const getSyncStatusBadge = (backup: any) => {
    if (!backup.sync_status || backup.sync_status === 'not_synced') {
      return (
        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
          Não sincronizado
        </span>
      );
    }
    
    switch (backup.sync_status) {
      case 'syncing':
        return (
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full flex items-center">
            <Upload className="w-3 h-3 mr-1 animate-spin" />
            Sincronizando
          </span>
        );
      case 'synced':
        return (
          <span className="px-2 py-1 text-xs bg-green-100 text-green-600 rounded-full flex items-center">
            <Cloud className="w-3 h-3 mr-1" />
            Sincronizado
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
            Falha na sincronização
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Equipamentos</h1>
            <p className="text-gray-600">Gerencie seus equipamentos e monitore backups</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="lg" className="btn-primary">
            <Plus className="h-5 w-5 mr-2" />
            Novo Equipamento
          </Button>
        </div>
        
        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{equipamentos.length}</p>
              </div>
              <div className="icon-container bg-gray-100">
                <Server className="h-6 w-6 text-gray-700" />
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Online</p>
                <p className="text-2xl font-bold text-gray-900">{equipamentos.length}</p>
              </div>
              <div className="icon-container bg-gray-100">
                <Activity className="h-6 w-6 text-gray-700" />
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Com Backup</p>
                <p className="text-2xl font-bold text-gray-900">
                  {equipamentos.filter(eq => (eq.backup_count || 0) > 0).length}
                </p>
              </div>
              <div className="icon-container bg-gray-100">
                <HardDrive className="h-6 w-6 text-gray-700" />
              </div>
            </div>
          </div>
          
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tipos</p>
                <p className="text-2xl font-bold text-gray-900">{getUniqueTypes().length}</p>
              </div>
              <div className="icon-container bg-gray-100">
                <Users className="h-6 w-6 text-gray-700" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex flex-1 items-center space-x-4 w-full sm:w-auto">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, IP ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 pr-4"
              />
            </div>
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input pl-10 pr-8 min-w-[140px]"
            >
              <option value="">Todos os tipos</option>
              {getUniqueTypes().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          {(searchTerm || filterType) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setFilterType('');
              }}
            >
              Limpar
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'} transition-all`}
              title="Visualização em grade"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'} transition-all`}
              title="Visualização em lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          
          <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
            {filteredEquipamentos.length} equipamento(s)
          </div>
        </div>
      </div>

      {filteredEquipamentos.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 max-w-md mx-auto">
            <div className="bg-white rounded-full p-6 w-24 h-24 mx-auto mb-6 shadow-sm">
              <Server className="h-12 w-12 text-gray-400 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {searchTerm || filterType ? 'Nenhum equipamento encontrado' : 'Nenhum equipamento cadastrado'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterType
                ? 'Tente ajustar sua busca ou limpar os filtros para ver mais resultados'
                : 'Comece adicionando seu primeiro equipamento para gerenciar backups'
              }
            </p>
            {!searchTerm && !filterType ? (
              <Button onClick={() => setShowCreateModal(true)} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Adicionar Primeiro Equipamento
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
          : "space-y-4"
        }>
          {filteredEquipamentos.map((equipamento) => {
            const backupStatus = getBackupStatusInfo(equipamento.backup_count || 0);
            const StatusIcon = backupStatus.icon;
            
            return viewMode === 'grid' ? (
              <div key={equipamento.id} className="card hover-lift group overflow-hidden">
                {/* Header compacto */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getEquipmentTypeIcon(equipamento.tipo)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-600 transition-colors">
                          {equipamento.nome}
                        </h3>
                        <p className="text-xs text-gray-500 font-mono">{equipamento.ip}</p>
                      </div>
                    </div>
                    {/* Botões de ação no header */}
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEdit(equipamento)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(equipamento.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Conteúdo compacto */}
                <div className="p-4">
                  {/* Info grid compacta */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Tipo</p>
                      <p className="text-sm font-medium text-gray-900">{equipamento.tipo}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Backups</p>
                      <p className={`text-sm font-bold ${backupStatus.color}`}>
                        {equipamento.backup_count || 0}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">Online</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${backupStatus.bgColor} ${backupStatus.color}`}>
                        {backupStatus.text}
                      </span>
                    </div>
                  </div>
                  
                  {/* Botões de ação principais - 2x2 grid */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/equipamentos/${equipamento.id}/upload`)}
                        className="text-xs"
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewBackups(equipamento)}
                        className="text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Backups
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/equipamentos/${equipamento.id}/upload`)}
                        className="text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Avançado
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEquipamentoForAutoBackup(equipamento);
                          setShowAutoBackupModal(true);
                        }}
                        className={`text-xs ${equipamento.auto_backup_enabled ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
                        title="Configurar backup automático"
                      >
                        <Cog className="h-3 w-3 mr-1" />
                        Auto
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div key={equipamento.id} className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 group">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      {getEquipmentTypeIcon(equipamento.tipo)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {equipamento.nome}
                          </h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {equipamento.tipo}
                          </span>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-500">Online</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <Server className="h-4 w-4 text-gray-400" />
                            <div>
                              <span className="text-gray-500">IP:</span>
                              <p className="font-medium text-gray-900 font-mono">{equipamento.ip}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <StatusIcon className={`h-4 w-4 ${backupStatus.color}`} />
                            <div>
                              <span className="text-gray-500">Backups:</span>
                              <p className={`font-medium ${backupStatus.color}`}>{equipamento.backup_count || 0}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div>
                              <span className="text-gray-500">Criado:</span>
                              <p className="font-medium text-gray-900" title={formatDate(equipamento.created_at)}>
                                {getRelativeTime(equipamento.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4 text-green-500" />
                            <div>
                              <span className="text-gray-500">Status:</span>
                              <p className="font-medium text-green-600">Online</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewBackups(equipamento)}
                        className="opacity-70 group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Backups
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(equipamento)}
                        className="opacity-70 group-hover:opacity-100 transition-opacity"
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar Equipamento */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Equipamento"
        size="lg"
      >
        <EquipamentoForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          isLoading={isSubmitting}
          submitLabel="Criar Equipamento"
        />
      </Modal>

      {/* Modal Editar Equipamento */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEquipamento(null);
        }}
        title="Editar Equipamento"
        size="lg"
      >
        {editingEquipamento && (
          <EquipamentoForm
            initialData={editingEquipamento}
            onSubmit={handleUpdate}
            onCancel={() => {
              setShowEditModal(false);
              setEditingEquipamento(null);
            }}
            isLoading={isSubmitting}
            submitLabel="Atualizar Equipamento"
          />
        )}
      </Modal>

      {/* Modal Ver Backups */}
      <Modal
        isOpen={showBackupsModal}
        onClose={() => {
          setShowBackupsModal(false);
          setSelectedEquipamento(null);
          setEquipamentoBackups([]);
        }}
        title={`Backups - ${selectedEquipamento?.nome}`}
        size="xl"
      >
        {selectedEquipamento && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center space-x-4 mb-4">
                {getEquipmentTypeIcon(selectedEquipamento.tipo)}
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedEquipamento.nome}</h3>
                  <p className="text-blue-700 font-medium">{selectedEquipamento.tipo}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Endereço IP</span>
                      <p className="text-lg font-bold text-gray-900 font-mono">{selectedEquipamento.ip}</p>
                    </div>
                    <Server className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Total de Backups</span>
                      <p className="text-lg font-bold text-blue-600">{selectedEquipamento.backup_count || 0}</p>
                    </div>
                    <HardDrive className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Status</span>
                      <p className="text-lg font-bold text-green-600">Online</p>
                    </div>
                    <Activity className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </div>
            </div>

            {equipamentoBackups.length === 0 ? (
              <div className="text-center py-8">
                <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum backup encontrado para este equipamento</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {equipamentoBackups.map((backup) => (
                  <div key={backup.id} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1">{backup.nome_arquivo}</p>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Enviado em: {formatDate(backup.data_upload)}</span>
                          {backup.file_size && (
                            <span className="font-medium">{formatFileSize(backup.file_size)}</span>
                          )}
                        </div>
                        {backup.last_sync_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Última sincronização: {formatDate(backup.last_sync_date)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getSyncStatusBadge(backup)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCloudSync(backup)}
                          className="flex items-center space-x-1"
                        >
                          <Cloud className="w-4 h-4" />
                          <span>Sincronizar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(backup.id, backup.nome_arquivo)}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Cloud Sync */}
      {selectedBackup && (
        <CloudSyncModal
          isOpen={showCloudSyncModal}
          onClose={() => {
            setShowCloudSyncModal(false);
            setSelectedBackup(null);
          }}
          backup={selectedBackup}
          onSyncComplete={handleSyncComplete}
        />
      )}

      {/* Modal Auto Backup Configuration */}
      {selectedEquipamentoForAutoBackup && (
        <AutoBackupConfigModal
          isOpen={showAutoBackupModal}
          onClose={() => {
            setShowAutoBackupModal(false);
            setSelectedEquipamentoForAutoBackup(null);
          }}
          equipamento={selectedEquipamentoForAutoBackup}
          onSave={(updatedEquipamento) => {
            // Atualizar o equipamento na lista local
            setEquipamentos(prevEquipamentos => 
              prevEquipamentos.map(eq => 
                eq.id === updatedEquipamento.id 
                  ? { ...eq, ...updatedEquipamento }
                  : eq
              )
            );
            setShowAutoBackupModal(false);
            setSelectedEquipamentoForAutoBackup(null);
            toast.success('Configuração de auto backup salva!');
          }}
        />
      )}
    </div>
  );
}