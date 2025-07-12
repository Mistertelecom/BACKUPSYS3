import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { HardDrive, Database, TrendingUp, AlertCircle, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatFileSize } from '../../utils/cn';

interface UsageData {
  equipmentUsage: Array<{
    name: string;
    backupCount: number;
    totalSize: number;
    avgSize: number;
    lastBackup: string;
  }>;
  sizeByType: Array<{
    name: string;
    size: number;
    count: number;
    color: string;
  }>;
  monthlyGrowth: Array<{
    month: string;
    totalSize: number;
    backupCount: number;
  }>;
  totalStorage: {
    used: number;
    total: number;
    percentage: number;
  };
  recommendations: Array<{
    type: 'warning' | 'info' | 'success';
    message: string;
  }>;
}

interface UsageReportProps {
  backups: any[];
}

export function UsageReport({ backups }: UsageReportProps) {
  const [usageData, setUsageData] = useState<UsageData>({
    equipmentUsage: [],
    sizeByType: [],
    monthlyGrowth: [],
    totalStorage: { used: 0, total: 1000, percentage: 0 },
    recommendations: []
  });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const getFileSize = (backup: any): number => {
    // Use actual file size from database if available
    if (backup.file_size && backup.file_size > 0) {
      return backup.file_size;
    }
    // Fallback to estimated size based on filename extension
    const extension = backup.nome_arquivo.split('.').pop()?.toLowerCase();
    const estimatedSizes: { [key: string]: number } = {
      'zip': 50 * 1024 * 1024,    // 50MB
      'tar.gz': 80 * 1024 * 1024, // 80MB
      'tgz': 80 * 1024 * 1024,    // 80MB
      'bak': 100 * 1024 * 1024,   // 100MB
      'sql': 20 * 1024 * 1024,    // 20MB
      'db': 150 * 1024 * 1024,    // 150MB
      'backup': 200 * 1024 * 1024 // 200MB
    };
    return estimatedSizes[extension || ''] || 75 * 1024 * 1024; // Default 75MB
  };

  useEffect(() => {
    if (backups.length === 0) return;

    // Calcular uso por equipamento
    const equipmentMap = new Map();
    backups.forEach(backup => {
      const key = `${backup.equipamento_nome} (${backup.equipamento_ip})`;
      const size = getFileSize(backup);
      
      if (!equipmentMap.has(key)) {
        equipmentMap.set(key, {
          name: key,
          backupCount: 0,
          totalSize: 0,
          lastBackup: backup.data_upload
        });
      }
      
      const equipment = equipmentMap.get(key);
      equipment.backupCount++;
      equipment.totalSize += size;
      
      // Atualizar último backup se for mais recente
      if (new Date(backup.data_upload) > new Date(equipment.lastBackup)) {
        equipment.lastBackup = backup.data_upload;
      }
    });

    const equipmentUsage = Array.from(equipmentMap.values())
      .map(eq => ({
        ...eq,
        avgSize: eq.totalSize / eq.backupCount
      }))
      .sort((a, b) => b.totalSize - a.totalSize);

    // Calcular uso por tipo
    const typeMap = new Map();
    backups.forEach(backup => {
      const type = backup.equipamento_tipo;
      const size = getFileSize(backup);
      
      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, size: 0 });
      }
      
      const typeData = typeMap.get(type);
      typeData.count++;
      typeData.size += size;
    });

    const sizeByType = Array.from(typeMap.entries()).map(([name, data], index) => ({
      name,
      size: data.size,
      count: data.count,
      color: colors[index % colors.length]
    }));

    // Calcular crescimento mensal
    const now = new Date();
    const monthlyMap = new Map();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      monthlyMap.set(monthKey, { totalSize: 0, backupCount: 0 });
    }

    backups.forEach(backup => {
      const backupDate = new Date(backup.data_upload);
      const monthKey = backupDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      if (monthlyMap.has(monthKey)) {
        const monthData = monthlyMap.get(monthKey);
        monthData.backupCount++;
        monthData.totalSize += getFileSize(backup);
      }
    });

    const monthlyGrowth = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      totalSize: Math.floor(data.totalSize / (1024 * 1024)), // MB
      backupCount: data.backupCount
    }));

    // Calcular armazenamento total
    const totalUsed = equipmentUsage.reduce((sum, eq) => sum + eq.totalSize, 0);
    const totalStorageGB = 1000; // 1TB simulado
    const usedGB = totalUsed / (1024 * 1024 * 1024);
    
    const totalStorage = {
      used: usedGB,
      total: totalStorageGB,
      percentage: (usedGB / totalStorageGB) * 100
    };

    // Gerar recomendações
    const recommendations = [];
    
    if (totalStorage.percentage > 80) {
      recommendations.push({
        type: 'warning' as const,
        message: 'Armazenamento está acima de 80%. Considere limpar backups antigos.'
      });
    }
    
    if (equipmentUsage.some(eq => eq.backupCount > 50)) {
      recommendations.push({
        type: 'info' as const,
        message: 'Alguns equipamentos têm muitos backups. Configure políticas de retenção.'
      });
    }
    
    if (totalStorage.percentage < 50) {
      recommendations.push({
        type: 'success' as const,
        message: 'Armazenamento está em bom estado. Continue monitorando o crescimento.'
      });
    }

    // Verificar equipamentos sem backup recente (mais de 7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const outdatedEquipment = equipmentUsage.filter(eq => 
      new Date(eq.lastBackup) < sevenDaysAgo
    );
    
    if (outdatedEquipment.length > 0) {
      recommendations.push({
        type: 'warning' as const,
        message: `${outdatedEquipment.length} equipamento(s) sem backup há mais de 7 dias.`
      });
    }

    setUsageData({
      equipmentUsage,
      sizeByType,
      monthlyGrowth,
      totalStorage,
      recommendations
    });
  }, [backups]);

  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalBackups: backups.length,
        totalStorage: usageData.totalStorage,
        equipmentCount: usageData.equipmentUsage.length
      },
      equipmentUsage: usageData.equipmentUsage,
      recommendations: usageData.recommendations
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-usage-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header com exportação */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Relatório de Uso e Armazenamento</h2>
        <Button onClick={exportReport} variant="outline" className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Exportar Relatório</span>
        </Button>
      </div>

      {/* Resumo de armazenamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Espaço Usado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatFileSize(usageData.totalStorage.used * 1024 * 1024 * 1024)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{usageData.totalStorage.percentage.toFixed(1)}% usado</span>
              <span>{formatFileSize(usageData.totalStorage.total * 1024 * 1024 * 1024)} total</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  usageData.totalStorage.percentage > 80 ? 'bg-red-500' : 
                  usageData.totalStorage.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usageData.totalStorage.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Maior Consumidor</p>
              <p className="text-lg font-bold text-gray-900">
                {usageData.equipmentUsage[0]?.name.split(' (')[0] || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                {usageData.equipmentUsage[0] ? formatFileSize(usageData.equipmentUsage[0].totalSize) : '0 B'}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Equipamentos Ativos</p>
              <p className="text-2xl font-bold text-gray-900">{usageData.equipmentUsage.length}</p>
              <p className="text-sm text-gray-500">com backups</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <HardDrive className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recomendações */}
      {usageData.recommendations.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Recomendações
          </h3>
          <div className="space-y-3">
            {usageData.recommendations.map((rec, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border-l-4 ${
                  rec.type === 'warning' ? 'bg-yellow-50 border-yellow-400 text-yellow-800' :
                  rec.type === 'success' ? 'bg-green-50 border-green-400 text-green-800' :
                  'bg-blue-50 border-blue-400 text-blue-800'
                }`}
              >
                {rec.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uso por equipamento */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Uso por Equipamento</h3>
          <div className="space-y-4">
            {usageData.equipmentUsage.slice(0, 10).map((equipment, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {equipment.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatFileSize(equipment.totalSize)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>{equipment.backupCount} backups</span>
                    <span>Média: {formatFileSize(equipment.avgSize)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(equipment.totalSize / Math.max(...usageData.equipmentUsage.map(e => e.totalSize))) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição por tipo */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Distribuição por Tipo</h3>
          {usageData.sizeByType.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={usageData.sizeByType}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="size"
                  >
                    {usageData.sizeByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatFileSize(value)} />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="space-y-2 mt-4">
                {usageData.sizeByType.map((type, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: type.color }}
                      ></div>
                      <span className="text-sm text-gray-900">{type.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatFileSize(type.size)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {type.count} backup(s)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Crescimento mensal */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Crescimento de Armazenamento (6 meses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={usageData.monthlyGrowth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" orientation="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value: any, name: string) => [
                name === 'totalSize' ? `${value} MB` : value,
                name === 'totalSize' ? 'Tamanho Total' : 'Quantidade'
              ]}
            />
            <Bar yAxisId="left" dataKey="totalSize" fill="#3B82F6" name="totalSize" />
            <Bar yAxisId="right" dataKey="backupCount" fill="#10B981" name="backupCount" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}