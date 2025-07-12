import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HardDrive, TrendingUp, Calendar, Activity } from 'lucide-react';

interface BackupStatsData {
  totalBackups: number;
  backupsByType: Array<{ name: string; value: number; color: string }>;
  backupsByMonth: Array<{ month: string; count: number }>;
  equipmentStats: Array<{ name: string; count: number }>;
  totalSize: string;
  avgBackupsPerDay: number;
}

interface BackupStatsProps {
  backups: any[];
}

export function BackupStats({ backups }: BackupStatsProps) {
  const [stats, setStats] = useState<BackupStatsData>({
    totalBackups: 0,
    backupsByType: [],
    backupsByMonth: [],
    equipmentStats: [],
    totalSize: '0 MB',
    avgBackupsPerDay: 0
  });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  useEffect(() => {
    if (backups.length === 0) return;

    // Total de backups
    const totalBackups = backups.length;

    // Backups por tipo de equipamento
    const typeCount = backups.reduce((acc: any, backup) => {
      acc[backup.equipamento_tipo] = (acc[backup.equipamento_tipo] || 0) + 1;
      return acc;
    }, {});

    const backupsByType = Object.entries(typeCount).map(([name, value], index) => ({
      name,
      value: value as number,
      color: colors[index % colors.length]
    }));

    // Backups por mês (últimos 6 meses)
    const now = new Date();
    const monthsData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const count = backups.filter(backup => {
        const backupDate = new Date(backup.data_upload);
        return backupDate.getMonth() === date.getMonth() && 
               backupDate.getFullYear() === date.getFullYear();
      }).length;
      
      monthsData.push({ month: monthName, count });
    }

    // Equipamentos com mais backups
    const equipmentCount = backups.reduce((acc: any, backup) => {
      const key = `${backup.equipamento_nome} (${backup.equipamento_ip})`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const equipmentStats = Object.entries(equipmentCount)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Média de backups por dia (últimos 30 dias)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentBackups = backups.filter(backup => 
      new Date(backup.data_upload) >= thirtyDaysAgo
    );
    const avgBackupsPerDay = Math.round((recentBackups.length / 30) * 10) / 10;

    setStats({
      totalBackups,
      backupsByType,
      backupsByMonth: monthsData,
      equipmentStats,
      totalSize: '0 MB', // TODO: Implementar cálculo real do tamanho
      avgBackupsPerDay
    });
  }, [backups]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-full">
              <HardDrive className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Total de Backups</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBackups}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-full">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Média/Dia (30d)</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgBackupsPerDay}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-full">
              <Activity className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Tipos Diferentes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.backupsByType.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-full">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Equipamentos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.equipmentStats.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de pizza - Backups por tipo */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Backups por Tipo de Equipamento</h3>
        {stats.backupsByType.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={stats.backupsByType}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {stats.backupsByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500">
            Nenhum dado disponível
          </div>
        )}
        
        {/* Legenda */}
        <div className="flex flex-wrap gap-3 mt-4">
          {stats.backupsByType.map((item, index) => (
            <div key={index} className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className="text-sm text-gray-600">{item.name} ({item.value})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gráfico de barras - Backups por mês */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Histórico de Backups (6 meses)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.backupsByMonth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top equipamentos */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top 5 Equipamentos</h3>
        <div className="space-y-3">
          {stats.equipmentStats.map((equipment, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                </div>
                <span className="text-sm text-gray-900 truncate">{equipment.name}</span>
              </div>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ 
                      width: `${(equipment.count / Math.max(...stats.equipmentStats.map(e => e.count))) * 100}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-8 text-right">
                  {equipment.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}