import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldX, AlertTriangle, CheckCircle, XCircle, Play, RotateCcw, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from 'react-hot-toast';

interface IntegrityResult {
  backupId: number;
  fileName: string;
  equipmentName: string;
  status: 'pending' | 'checking' | 'valid' | 'corrupted' | 'error';
  checksum: string | null;
  originalChecksum: string | null;
  fileSize: number;
  lastChecked: string | null;
  errorMessage?: string;
}

interface IntegrityCheckerProps {
  backups: any[];
}

export function IntegrityChecker({ backups }: IntegrityCheckerProps) {
  const [results, setResults] = useState<IntegrityResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<'all' | 'valid' | 'corrupted' | 'pending' | 'error'>('all');

  // Simular checksums e resultados
  const generateMockChecksum = (): string => {
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  };

  const generateMockSize = (): number => {
    return Math.floor(Math.random() * (500 * 1024 * 1024 - 5 * 1024 * 1024) + 5 * 1024 * 1024);
  };

  useEffect(() => {
    // Inicializar resultados com status pending
    const initialResults: IntegrityResult[] = backups.map(backup => ({
      backupId: backup.id,
      fileName: backup.nome_arquivo,
      equipmentName: backup.equipamento_nome,
      status: 'pending',
      checksum: null,
      originalChecksum: generateMockChecksum(),
      fileSize: generateMockSize(),
      lastChecked: null
    }));
    setResults(initialResults);
  }, [backups]);

  const checkIntegrity = async (backupIds?: number[]) => {
    setIsRunning(true);
    setProgress(0);
    
    const toCheck = backupIds || results.map(r => r.backupId);
    const total = toCheck.length;
    
    for (let i = 0; i < total; i++) {
      const backupId = toCheck[i];
      
      // Atualizar status para checking
      setResults(prev => prev.map(result => 
        result.backupId === backupId 
          ? { ...result, status: 'checking' as const }
          : result
      ));

      // Simular verificação (tempo aleatório entre 1-3 segundos)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

      // Simular resultado (90% válido, 5% corrompido, 5% erro)
      const rand = Math.random();
      let status: 'valid' | 'corrupted' | 'error';
      let checksum: string | null;
      let errorMessage: string | undefined;

      if (rand < 0.9) {
        status = 'valid';
        checksum = results.find(r => r.backupId === backupId)?.originalChecksum || generateMockChecksum();
      } else if (rand < 0.95) {
        status = 'corrupted';
        checksum = generateMockChecksum(); // Checksum diferente
      } else {
        status = 'error';
        checksum = null;
        errorMessage = 'Arquivo não encontrado ou inacessível';
      }

      // Atualizar resultado
      setResults(prev => prev.map(result => 
        result.backupId === backupId 
          ? { 
              ...result, 
              status, 
              checksum,
              lastChecked: new Date().toISOString(),
              errorMessage
            }
          : result
      ));

      setProgress(((i + 1) / total) * 100);
    }

    setIsRunning(false);
    toast.success(`Verificação concluída! ${toCheck.length} backup(s) verificado(s).`);
  };

  const checkSingle = async (backupId: number) => {
    await checkIntegrity([backupId]);
  };

  const checkAll = async () => {
    await checkIntegrity();
  };

  const recheckFailed = async () => {
    const failedIds = results
      .filter(r => r.status === 'corrupted' || r.status === 'error')
      .map(r => r.backupId);
    
    if (failedIds.length === 0) {
      toast.info('Nenhum backup com falha para reverificar.');
      return;
    }
    
    await checkIntegrity(failedIds);
  };

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        total: results.length,
        valid: results.filter(r => r.status === 'valid').length,
        corrupted: results.filter(r => r.status === 'corrupted').length,
        error: results.filter(r => r.status === 'error').length,
        pending: results.filter(r => r.status === 'pending').length
      },
      details: results.map(r => ({
        backupId: r.backupId,
        fileName: r.fileName,
        equipmentName: r.equipmentName,
        status: r.status,
        lastChecked: r.lastChecked,
        errorMessage: r.errorMessage
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `integrity-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Nunca verificado';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case 'corrupted':
        return <ShieldX className="h-5 w-5 text-red-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <RotateCcw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Shield className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'corrupted':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'checking':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Íntegro';
      case 'corrupted':
        return 'Corrompido';
      case 'error':
        return 'Erro';
      case 'checking':
        return 'Verificando';
      default:
        return 'Pendente';
    }
  };

  const filteredResults = results.filter(result => {
    if (filter === 'all') return true;
    return result.status === filter;
  });

  const summary = {
    total: results.length,
    valid: results.filter(r => r.status === 'valid').length,
    corrupted: results.filter(r => r.status === 'corrupted').length,
    error: results.filter(r => r.status === 'error').length,
    pending: results.filter(r => r.status === 'pending').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Verificação de Integridade</h2>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={recheckFailed}
            variant="outline"
            disabled={isRunning || (summary.corrupted + summary.error) === 0}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reverificar Falhas</span>
          </Button>
          
          <Button 
            onClick={exportReport}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Relatório</span>
          </Button>
          
          <Button 
            onClick={checkAll}
            disabled={isRunning}
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>{isRunning ? 'Verificando...' : 'Verificar Todos'}</span>
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {isRunning && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso da Verificação</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-full mr-3">
              <Shield className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-full mr-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Íntegros</p>
              <p className="text-2xl font-bold text-green-600">{summary.valid}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-full mr-3">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Corrompidos</p>
              <p className="text-2xl font-bold text-red-600">{summary.corrupted}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-full mr-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Erros</p>
              <p className="text-2xl font-bold text-red-600">{summary.error}</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-full mr-3">
              <Shield className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendentes</p>
              <p className="text-2xl font-bold text-gray-600">{summary.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-700">Filtrar por status:</span>
        <div className="flex space-x-2">
          {[
            { key: 'all', label: 'Todos', count: summary.total },
            { key: 'valid', label: 'Íntegros', count: summary.valid },
            { key: 'corrupted', label: 'Corrompidos', count: summary.corrupted },
            { key: 'error', label: 'Erros', count: summary.error },
            { key: 'pending', label: 'Pendentes', count: summary.pending }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                filter === key
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        {filteredResults.map((result) => (
          <div key={result.backupId} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{result.fileName}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <span><strong>Equipamento:</strong> {result.equipmentName}</span>
                    <span><strong>Tamanho:</strong> {formatSize(result.fileSize)}</span>
                    <span><strong>Última verificação:</strong> {formatDate(result.lastChecked)}</span>
                  </div>
                  {result.errorMessage && (
                    <p className="text-sm text-red-600 mt-1">{result.errorMessage}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(result.status)}`}>
                  {getStatusText(result.status)}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkSingle(result.backupId)}
                  disabled={isRunning || result.status === 'checking'}
                  className="flex items-center space-x-1"
                >
                  <Play className="h-3 w-3" />
                  <span>Verificar</span>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredResults.length === 0 && (
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum backup encontrado</h3>
          <p className="text-gray-500">
            {filter !== 'all' 
              ? `Não há backups com status "${getStatusText(filter)}"`
              : 'Nenhum backup disponível para verificação'
            }
          </p>
        </div>
      )}
    </div>
  );
}