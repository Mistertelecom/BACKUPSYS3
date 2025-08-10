import { useState, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  GitBranch,
  Server,
  HardDrive,
  Zap,
  History,
  X
} from 'lucide-react';
import { useUpdates } from '../../hooks/useUpdates';

export function GitHubUpdatesSection() {
  const {
    updateInfo,
    systemInfo,
    loading,
    updating,
    error,
    checkForUpdates,
    getSystemInfo,
    createBackup,
    applyUpdate,
    restartSystem,
    formatUpdateType,
    formatDate
  } = useUpdates();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [updateStep, setUpdateStep] = useState<'idle' | 'backup' | 'update' | 'restart' | 'complete'>('idle');
  const [backupPath, setBackupPath] = useState<string>('');

  useEffect(() => {
    getSystemInfo();
    checkForUpdates();
  }, [getSystemInfo, checkForUpdates]);

  const handleUpdateClick = () => {
    if (updateInfo?.hasUpdate) {
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmUpdate = async () => {
    setShowConfirmDialog(false);
    setUpdateStep('backup');

    try {
      // Etapa 1: Criar backup
      const backupResult = await createBackup();
      if (!backupResult.success) {
        throw new Error(backupResult.error || 'Falha ao criar backup');
      }
      
      if (backupResult.backupPath) {
        setBackupPath(backupResult.backupPath);
      }

      // Etapa 2: Aplicar atualização
      setUpdateStep('update');
      const updateResult = await applyUpdate();
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Falha ao aplicar atualização');
      }

      // Etapa 3: Reiniciar sistema
      setUpdateStep('restart');
      setTimeout(async () => {
        await restartSystem();
        setUpdateStep('complete');
      }, 3000);

    } catch (error) {
      console.error('Erro durante atualização:', error);
      setUpdateStep('idle');
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'backup':
        return <HardDrive className="h-5 w-5 text-blue-600" />;
      case 'update':
        return <Download className="h-5 w-5 text-green-600" />;
      case 'restart':
        return <Zap className="h-5 w-5 text-yellow-600" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepMessage = (step: string) => {
    switch (step) {
      case 'backup':
        return 'Criando backup do sistema atual...';
      case 'update':
        return 'Baixando e aplicando atualização...';
      case 'restart':
        return 'Reiniciando sistema...';
      case 'complete':
        return 'Atualização concluída com sucesso!';
      default:
        return '';
    }
  };

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'major':
        return 'bg-red-100 text-red-800';
      case 'minor':
        return 'bg-blue-100 text-blue-800';
      case 'patch':
        return 'bg-green-100 text-green-800';
      case 'commit':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !systemInfo) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Verificando atualizações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informações do Sistema */}
      {systemInfo && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Server className="h-6 w-6 text-blue-600 mr-2" />
              Sistema Atual
            </h2>
            <button
              onClick={() => {
                getSystemInfo();
                checkForUpdates();
              }}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Verificar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <GitBranch className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Versão</p>
                <p className="text-xs text-gray-500">{systemInfo.version}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <History className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Commit</p>
                <p className="text-xs text-gray-500">{systemInfo.commit}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <GitBranch className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Branch</p>
                <p className="text-xs text-gray-500">{systemInfo.branch}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Uptime</p>
                <p className="text-xs text-gray-500">{Math.floor(systemInfo.uptime / 3600)}h</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status de Atualização */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Download className="h-6 w-6 text-green-600 mr-2" />
            Atualizações do GitHub
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Erro</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {updateInfo && (
          <div className="space-y-4">
            {updateInfo.hasUpdate ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <AlertTriangle className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-medium text-blue-900">
                        Nova Atualização Disponível
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUpdateTypeColor(updateInfo.updateType)}`}>
                        {formatUpdateType(updateInfo.updateType)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-blue-800 mb-3">
                      <span>{updateInfo.currentVersion} → {updateInfo.latestVersion}</span>
                      <span>{formatDate(updateInfo.publishedAt)}</span>
                    </div>

                    <div className="bg-white rounded-md p-3 mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Notas da Atualização:</h4>
                      <div className="text-sm text-gray-700 whitespace-pre-line">
                        {updateInfo.releaseNotes}
                      </div>
                    </div>

                    {updateInfo.commits && updateInfo.commits.length > 0 && (
                      <div className="bg-white rounded-md p-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Commits Incluídos:</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {updateInfo.commits.slice(0, 5).map((commit) => (
                            <div key={commit.sha} className="flex items-start space-x-2 text-xs">
                              <span className="text-gray-400 font-mono">{commit.sha.substring(0, 7)}</span>
                              <span className="text-gray-700">{commit.commit.message.split('\n')[0]}</span>
                            </div>
                          ))}
                          {updateInfo.commits.length > 5 && (
                            <div className="text-xs text-gray-500">
                              +{updateInfo.commits.length - 5} commits adicionais
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="text-lg font-medium text-green-900">Sistema Atualizado</h3>
                  <p className="text-sm text-green-700">
                    Você está usando a versão mais recente ({updateInfo.currentVersion})
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Shield className="h-4 w-4" />
            <span>Backup automático antes da atualização</span>
          </div>

          {updateInfo?.hasUpdate && (
            <button
              onClick={handleUpdateClick}
              disabled={updating || updateStep !== 'idle'}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>Atualizar Sistema</span>
            </button>
          )}
        </div>
      </div>

      {/* Diálogo de Confirmação */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <h3 className="text-lg font-semibold text-gray-900">Confirmar Atualização</h3>
              </div>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-700">
                Esta ação irá atualizar o sistema de <strong>{updateInfo?.currentVersion}</strong> para <strong>{updateInfo?.latestVersion}</strong>.
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Processo de Atualização:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Backup automático do sistema atual</li>
                  <li>• Download e aplicação da atualização</li>
                  <li>• Reinício do sistema</li>
                  <li>• Preservação de dados e configurações</li>
                </ul>
              </div>

              <p className="text-xs text-gray-600">
                <strong>Nota:</strong> O sistema ficará indisponível por alguns minutos durante a atualização.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUpdate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirmar Atualização
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress da Atualização */}
      {updateStep !== 'idle' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                {getStepIcon(updateStep)}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Atualizando Sistema
              </h3>
              
              <p className="text-sm text-gray-600 mb-4">
                {getStepMessage(updateStep)}
              </p>

              {backupPath && updateStep === 'backup' && (
                <p className="text-xs text-gray-500 mb-4">
                  Backup salvo em: {backupPath.split('/').pop()}
                </p>
              )}

              {updateStep !== 'complete' && (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              )}

              {updateStep === 'complete' && (
                <button
                  onClick={() => setUpdateStep('idle')}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}