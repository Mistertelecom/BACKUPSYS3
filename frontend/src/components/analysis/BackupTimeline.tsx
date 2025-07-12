import { useEffect, useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, Calendar, ArrowRight } from 'lucide-react';

interface EquipmentTimeline {
  equipmentId: number;
  equipmentName: string;
  equipmentIp: string;
  equipmentType: string;
  oldestBackup: {
    id: number;
    fileName: string;
    date: string;
    daysAgo: number;
  } | null;
  newestBackup: {
    id: number;
    fileName: string;
    date: string;
    daysAgo: number;
  } | null;
  totalBackups: number;
  averageDaysBetween: number;
  status: 'healthy' | 'warning' | 'critical';
}

interface BackupTimelineProps {
  backups: any[];
}

export function BackupTimeline({ backups }: BackupTimelineProps) {
  const [timeline, setTimeline] = useState<EquipmentTimeline[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'status'>('newest');
  const [filterStatus, setFilterStatus] = useState<'all' | 'healthy' | 'warning' | 'critical'>('all');

  const calculateDaysAgo = (dateString: string): number => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatus = (newestBackupDays: number): 'healthy' | 'warning' | 'critical' => {
    if (newestBackupDays <= 3) return 'healthy';
    if (newestBackupDays <= 7) return 'warning';
    return 'critical';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (backups.length === 0) {
      setTimeline([]);
      return;
    }

    // Agrupar backups por equipamento
    const equipmentMap = new Map();
    
    backups.forEach(backup => {
      const key = backup.equipamento_id;
      
      if (!equipmentMap.has(key)) {
        equipmentMap.set(key, {
          equipmentId: backup.equipamento_id,
          equipmentName: backup.equipamento_nome,
          equipmentIp: backup.equipamento_ip,
          equipmentType: backup.equipamento_tipo,
          backups: []
        });
      }
      
      equipmentMap.get(key).backups.push(backup);
    });

    // Processar timeline para cada equipamento
    const timelineData: EquipmentTimeline[] = Array.from(equipmentMap.values()).map(equipment => {
      const sortedBackups = equipment.backups.sort((a: any, b: any) => 
        new Date(a.data_upload).getTime() - new Date(b.data_upload).getTime()
      );

      const oldestBackup = sortedBackups[0];
      const newestBackup = sortedBackups[sortedBackups.length - 1];
      
      const oldestDaysAgo = calculateDaysAgo(oldestBackup.data_upload);
      const newestDaysAgo = calculateDaysAgo(newestBackup.data_upload);
      
      // Calcular média de dias entre backups
      let averageDaysBetween = 0;
      if (sortedBackups.length > 1) {
        const totalDaysBetween = sortedBackups.reduce((sum: number, backup: any, index: number) => {
          if (index === 0) return sum;
          const currentDate = new Date(backup.data_upload);
          const previousDate = new Date(sortedBackups[index - 1].data_upload);
          const daysDiff = Math.abs(currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24);
          return sum + daysDiff;
        }, 0);
        averageDaysBetween = Math.round(totalDaysBetween / (sortedBackups.length - 1));
      }

      const status = getStatus(newestDaysAgo);

      return {
        equipmentId: equipment.equipmentId,
        equipmentName: equipment.equipmentName,
        equipmentIp: equipment.equipmentIp,
        equipmentType: equipment.equipmentType,
        oldestBackup: {
          id: oldestBackup.id,
          fileName: oldestBackup.nome_arquivo,
          date: oldestBackup.data_upload,
          daysAgo: oldestDaysAgo
        },
        newestBackup: {
          id: newestBackup.id,
          fileName: newestBackup.nome_arquivo,
          date: newestBackup.data_upload,
          daysAgo: newestDaysAgo
        },
        totalBackups: sortedBackups.length,
        averageDaysBetween,
        status
      };
    });

    setTimeline(timelineData);
  }, [backups]);

  const filteredAndSortedTimeline = timeline
    .filter(item => filterStatus === 'all' || item.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (a.newestBackup?.daysAgo || 0) - (b.newestBackup?.daysAgo || 0);
        case 'oldest':
          return (b.oldestBackup?.daysAgo || 0) - (a.oldestBackup?.daysAgo || 0);
        case 'name':
          return a.equipmentName.localeCompare(b.equipmentName);
        case 'status':
          const statusOrder = { critical: 0, warning: 1, healthy: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        default:
          return 0;
      }
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const statusCounts = timeline.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Timeline de Backups por Equipamento</h2>
        
        <div className="flex items-center space-x-4">
          {/* Filtro por Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="input text-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="healthy">Saudável ({statusCounts.healthy || 0})</option>
            <option value="warning">Atenção ({statusCounts.warning || 0})</option>
            <option value="critical">Crítico ({statusCounts.critical || 0})</option>
          </select>

          {/* Ordenação */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input text-sm"
          >
            <option value="newest">Backup mais recente</option>
            <option value="oldest">Backup mais antigo</option>
            <option value="name">Nome do equipamento</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Resumo de Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Equipamentos</p>
              <p className="text-2xl font-bold text-gray-900">{timeline.length}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saudáveis</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.healthy || 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Atenção</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.warning || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Críticos</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts.critical || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Lista de Timeline */}
      <div className="space-y-4">
        {filteredAndSortedTimeline.map((item) => (
          <div key={item.equipmentId} className={`card p-6 border-l-4 ${
            item.status === 'healthy' ? 'border-l-green-500' :
            item.status === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{item.equipmentName}</h3>
                    <p className="text-sm text-gray-500">{item.equipmentIp} • {item.equipmentType}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>
                    {item.status === 'healthy' ? 'Saudável' :
                     item.status === 'warning' ? 'Atenção' : 'Crítico'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Backup mais antigo */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Backup Mais Antigo
                    </h4>
                    {item.oldestBackup && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.oldestBackup.fileName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(item.oldestBackup.date)}
                        </p>
                        <p className="text-xs text-gray-500">
                          há {item.oldestBackup.daysAgo} dias
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Backup mais recente */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Backup Mais Recente
                    </h4>
                    {item.newestBackup && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.newestBackup.fileName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(item.newestBackup.date)}
                        </p>
                        <p className={`text-xs font-medium ${
                          item.newestBackup.daysAgo <= 1 ? 'text-green-600' :
                          item.newestBackup.daysAgo <= 7 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          há {item.newestBackup.daysAgo} dias
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Estatísticas */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Estatísticas</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Total de Backups:</span>
                        <span className="text-xs font-medium text-gray-900">{item.totalBackups}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Frequência Média:</span>
                        <span className="text-xs font-medium text-gray-900">
                          {item.averageDaysBetween > 0 ? `${item.averageDaysBetween} dias` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Período Total:</span>
                        <span className="text-xs font-medium text-gray-900">
                          {item.oldestBackup && item.newestBackup ? 
                            `${item.oldestBackup.daysAgo - item.newestBackup.daysAgo} dias` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAndSortedTimeline.length === 0 && (
        <div className="text-center py-12">
          <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum equipamento encontrado</h3>
          <p className="text-gray-500">
            {filterStatus !== 'all' 
              ? `Não há equipamentos com status "${filterStatus}"`
              : 'Nenhum backup disponível para análise'
            }
          </p>
        </div>
      )}
    </div>
  );
}