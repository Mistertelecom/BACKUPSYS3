import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Server, HardDrive, Users, Activity, Download, Settings, CheckCircle, AlertCircle, Cloud, Clock, Calendar, Play, Pause, XCircle, TrendingUp, Database, Zap } from 'lucide-react';
import { dashboardAPI, backupsAPI, backupJobsAPI } from '../services/api';

interface DashboardStats {
  totalEquipamentos: number;
  totalBackups: number;
  totalUsers: number;
  totalProviders: number;
  activeProviders: number;
  totalBackupJobs: number;
  activeBackupJobs: number;
  scheduledJobs: number;
  equipamentosWithBackups: number;
  recentBackups: any[];
  backupsByProvider: Record<string, number>;
  backupsByStatus: Record<string, number>;
}

interface ProviderHealth {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  is_healthy: boolean;
  last_checked: string;
  backup_count?: number;
  storage_used?: string;
}

interface BackupJobsStats {
  total: number;
  active: number;
  paused: number;
  scheduled: number;
  nextJobs: NextScheduledJob[];
}

interface NextScheduledJob {
  id: number;
  equipamento_nome: string;
  equipamento_ip: string;
  next_run: string;
  cron_expression: string;
  provider_name: string;
  is_active: boolean;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [backupJobsStats, setBackupJobsStats] = useState<BackupJobsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const [statsResponse, healthResponse, backupJobsResponse] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getProviderHealth(),
        backupJobsAPI.getStats()
      ]);
      setStats(statsResponse.data);
      setProviderHealth(healthResponse.data);
      setBackupJobsStats(backupJobsResponse.data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const target = new Date(dateString);
    const diffInMinutes = Math.floor((target.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d`;
    }
  };

  const getProviderHealthStatus = (provider: ProviderHealth) => {
    if (!provider.is_active) {
      return { color: 'text-gray-500', bgColor: 'bg-gray-100', icon: XCircle, label: 'Inativo' };
    }
    if (provider.is_healthy) {
      return { color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle, label: 'Saudável' };
    }
    return { color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle, label: 'Problema' };
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'paused':
        return 'text-yellow-600 bg-yellow-100';
      case 'scheduled':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-16 bg-gray-200 rounded"></div>
                  ))}
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Activity className="h-4 w-4" />
          <span>Atualizado automaticamente</span>
        </div>
      </div>

      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Equipamentos</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalEquipamentos || 0}</p>
            </div>
            <div className="icon-container bg-blue-100">
              <Server className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Backups</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalBackups || 0}</p>
            </div>
            <div className="icon-container bg-green-100">
              <HardDrive className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Usuários</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
            </div>
            <div className="icon-container bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Equipamentos com Backup</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.equipamentosWithBackups || 0}</p>
            </div>
            <div className="icon-container bg-amber-100">
              <Activity className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Backup Jobs Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Jobs</p>
              <p className="text-3xl font-bold text-gray-900">{backupJobsStats?.total || 0}</p>
            </div>
            <div className="icon-container bg-indigo-100">
              <Database className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Jobs Ativos</p>
              <p className="text-3xl font-bold text-gray-900">{backupJobsStats?.active || 0}</p>
            </div>
            <div className="icon-container bg-green-100">
              <Play className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Jobs Pausados</p>
              <p className="text-3xl font-bold text-gray-900">{backupJobsStats?.paused || 0}</p>
            </div>
            <div className="icon-container bg-yellow-100">
              <Pause className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="stats-card">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Próximos Jobs</p>
              <p className="text-3xl font-bold text-gray-900">{backupJobsStats?.scheduled || 0}</p>
            </div>
            <div className="icon-container bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Provider Health and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Health Status */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Status dos Provedores</h2>
            <p className="card-description">Saúde e atividade dos provedores de backup</p>
          </div>
          <div className="card-body">
            {providerHealth?.length === 0 ? (
              <div className="text-center py-8">
                <Cloud className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum provedor configurado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {providerHealth?.map((provider) => {
                  const status = getProviderHealthStatus(provider);
                  const StatusIcon = status.icon;
                  return (
                    <div key={provider.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-sm transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className={`icon-container ${status.bgColor}`}>
                          <StatusIcon className={`h-4 w-4 ${status.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 mb-1">{provider.name}</p>
                          <p className="text-sm text-gray-600">{provider.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className={`text-sm font-medium ${status.color}`}>
                            {status.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {provider.backup_count || 0} backups
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Provider Distribution */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Distribuição por Provedor</h2>
            <p className="card-description">Backups por provedor de armazenamento</p>
          </div>
          <div className="card-body">
            {stats?.backupsByProvider && Object.keys(stats.backupsByProvider).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(stats.backupsByProvider).map(([provider, count]) => {
                  const percentage = stats.totalBackups > 0 ? (count / stats.totalBackups) * 100 : 0;
                  return (
                    <div key={provider} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{provider}</span>
                        <span className="text-sm text-gray-500">{count} backups</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum dados de distribuição disponível</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Next Scheduled Jobs and Recent Backups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Scheduled Jobs */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Próximos Jobs Agendados</h2>
            <p className="card-description">Jobs de backup programados para execução</p>
          </div>
          <div className="card-body">
            {backupJobsStats?.nextJobs?.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum job agendado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {backupJobsStats?.nextJobs?.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="icon-container bg-blue-100">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1">{job.equipamento_nome}</p>
                        <p className="text-sm text-gray-600">
                          {job.equipamento_ip} • {job.provider_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">
                          {formatRelativeTime(job.next_run)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(job.next_run)}
                        </p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${job.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {job.is_active ? 'Ativo' : 'Inativo'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Backups */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Backups Recentes</h2>
            <p className="card-description">Últimos 5 backups realizados</p>
          </div>
          <div className="card-body">
            {stats?.recentBackups?.length === 0 ? (
              <div className="text-center py-8">
                <HardDrive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum backup encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.recentBackups?.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="icon-container bg-blue-100">
                        <HardDrive className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 mb-1">{backup.nome_arquivo}</p>
                        <p className="text-sm text-gray-600">
                          {backup.equipamento_nome} • {backup.equipamento_ip}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">
                          {formatDate(backup.data_upload)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(backup.id, backup.nome_arquivo)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition-all duration-200"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}