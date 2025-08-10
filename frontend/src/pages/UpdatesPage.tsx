import React, { useState, useEffect } from 'react';
import { 
  Download, 
  RefreshCw, 
  Shield, 
  Archive, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Cloud,
  HardDrive,
  Code,
  X,
  ChevronDown,
  ChevronUp,
  Loader
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  publishedAt: string;
  isPrerelease: boolean;
  changelog: string[];
}

interface SystemStatus {
  version: string;
  hasLocalChanges: boolean;
  diskSpace: string;
  backupDirectory: string;
  lastBackup?: {
    date: string;
    size: string;
  };
}

interface Release {
  version: string;
  name: string;
  publishedAt: string;
  isPrerelease: boolean;
  isCurrent: boolean;
  hasAssets: boolean;
  downloadCount: number;
}

interface BackupFile {
  filename: string;
  path: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  modifiedAt: string;
}

const UpdatesPage: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [backupDialog, setBackupDialog] = useState(false);
  const [changelogExpanded, setChangelogExpanded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [updateResponse, statusResponse, releasesResponse, backupsResponse] = await Promise.all([
        api.get('/api/updates/check'),
        api.get('/api/updates/system/status'),
        api.get('/api/updates/releases?limit=10'),
        api.get('/api/updates/backups')
      ]);

      setUpdateInfo(updateResponse.data.updateInfo);
      setSystemStatus(statusResponse.data.status);
      setReleases(releasesResponse.data.releases);
      setBackups(backupsResponse.data.backups);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar informações de atualização');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdate = async () => {
    try {
      setLoading(true);
      
      const response = await api.get('/api/updates/check');
      setUpdateInfo(response.data.updateInfo);
      toast.success('Verificação de atualização concluída');
    } catch (error: any) {
      toast.error('Erro ao verificar atualizações');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      
      const response = await api.post('/api/updates/backup');
      
      if (response.data.success) {
        toast.success(`Backup criado: ${response.data.backup.filename}`);
        loadData();
        setBackupDialog(false);
      }
    } catch (error: any) {
      toast.error('Erro ao criar backup');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      
      const response = await api.post('/api/updates/update', {
        confirmBackup: true
      });

      if (response.data.success) {
        toast.success(`Sistema atualizado para v${response.data.newVersion}! Reinicie o servidor para aplicar as mudanças.`);
        setUpdateDialog(false);
        loadData();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro durante atualização';
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: ptBR
    });
  };

  const getStatusColor = (hasUpdate: boolean, isPrerelease: boolean) => {
    if (hasUpdate && !isPrerelease) return 'text-red-600 bg-red-100';
    if (hasUpdate && isPrerelease) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <RefreshCw className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Atualizações</h1>
          <p className="text-gray-600">Mantenha seu sistema sempre atualizado e seguro</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Atual */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Info className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Status do Sistema</h2>
            </div>
            
            {systemStatus && (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Versão Atual</p>
                  <p className="text-2xl font-bold text-blue-600">v{systemStatus.version}</p>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {systemStatus.hasLocalChanges ? (
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                      <span className="text-sm font-medium">Modificações Locais</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {systemStatus.hasLocalChanges ? 'Pendentes' : 'Limpo'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium">Espaço em Disco</span>
                    </div>
                    <span className="text-sm text-gray-600">82% usado</span>
                  </div>

                  {systemStatus.lastBackup && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Archive className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">Último Backup</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {formatDate(systemStatus.lastBackup.date)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={handleCheckUpdate}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Verificar</span>
                  </button>
                  
                  <button
                    onClick={() => setBackupDialog(true)}
                    disabled={creating}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Archive className={`h-4 w-4 ${creating ? 'animate-spin' : ''}`} />
                    <span>Backup</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Informações de Atualização */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Cloud className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Atualizações Disponíveis</h2>
            </div>

            {updateInfo && (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(updateInfo.hasUpdate, updateInfo.isPrerelease)}`}>
                    {updateInfo.hasUpdate ? 'Atualização Disponível' : 'Atualizado'}
                  </span>
                  
                  {updateInfo.isPrerelease && (
                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-100">
                      Pre-release
                    </span>
                  )}
                </div>

                {updateInfo.hasUpdate && (
                  <>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm">
                        <span className="font-medium">Nova versão:</span> v{updateInfo.latestVersion}
                      </p>
                      
                      <p className="text-sm text-gray-600">
                        Publicada {formatDate(updateInfo.publishedAt)}
                      </p>
                    </div>

                    {updateInfo.changelog.length > 0 && (
                      <div className="border rounded-lg mb-4">
                        <button
                          onClick={() => setChangelogExpanded(!changelogExpanded)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50"
                        >
                          <span className="text-sm font-medium">
                            Changelog ({updateInfo.changelog.length} itens)
                          </span>
                          {changelogExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {changelogExpanded && (
                          <div className="border-t p-3">
                            <ul className="space-y-2">
                              {updateInfo.changelog.map((item, index) => (
                                <li key={index} className="flex items-start space-x-2 text-sm">
                                  <Code className="h-3 w-3 mt-0.5 text-gray-600 flex-shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => setUpdateDialog(true)}
                      disabled={updating || systemStatus?.hasLocalChanges}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                      <span>Atualizar Sistema</span>
                    </button>

                    {systemStatus?.hasLocalChanges && (
                      <p className="text-xs text-orange-600 mt-2">
                        Resolva as modificações locais antes de atualizar
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Histórico de Releases */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Code className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Releases Recentes</h2>
            </div>

            {releases.length > 0 ? (
              <div className="space-y-3">
                {releases.slice(0, 5).map((release) => (
                  <div key={release.version} className="border-b pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">v{release.version}</span>
                        {release.isCurrent && (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
                            Atual
                          </span>
                        )}
                        {release.isPrerelease && (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-100">
                            Beta
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{release.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(release.publishedAt)} • {release.downloadCount} downloads
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Nenhum release encontrado</p>
            )}
          </div>
        </div>

        {/* Backups Disponíveis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Archive className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Backups do Sistema ({backups.length})
              </h2>
            </div>

            {backups.length > 0 ? (
              <div className="space-y-3">
                {backups.slice(0, 5).map((backup) => (
                  <div key={backup.filename} className="border-b pb-3 last:border-b-0 last:pb-0">
                    <p className="font-medium text-sm">{backup.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(backup.createdAt)} • {backup.sizeFormatted}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Nenhum backup disponível</p>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de Confirmação de Atualização */}
      {updateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Shield className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold">Confirmar Atualização do Sistema</h3>
              </div>
              
              {updateInfo && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                      Esta ação irá atualizar o sistema da versão <strong>v{updateInfo.currentVersion}</strong> para <strong>v{updateInfo.latestVersion}</strong>.
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <h4 className="font-semibold text-sm">Medidas de Segurança:</h4>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Backup automático será criado antes da atualização</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Validação de integridade dos arquivos</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Rollback automático em caso de falha</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Preservação de dados do usuário</span>
                      </div>
                    </div>
                  </div>

                  {systemStatus?.hasLocalChanges && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-orange-800">
                        <strong>Aviso:</strong> O sistema possui modificações locais não commitadas. 
                        A atualização não poderá prosseguir até que essas alterações sejam resolvidas.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="border-t p-4 flex space-x-3">
              <button
                onClick={() => setUpdateDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating || systemStatus?.hasLocalChanges}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updating ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>{updating ? 'Atualizando...' : 'Confirmar Atualização'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de Criação de Backup */}
      {backupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Criar Backup Manual</h3>
              
              <p className="text-sm text-gray-600 mb-4">
                Um backup completo do sistema será criado, incluindo:
              </p>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Banco de dados</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Arquivos de configuração</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Uploads e dados do usuário</span>
                </div>
              </div>
            </div>
            
            <div className="border-t p-4 flex space-x-3">
              <button
                onClick={() => setBackupDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={creating}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                <span>{creating ? 'Criando...' : 'Criar Backup'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdatesPage;