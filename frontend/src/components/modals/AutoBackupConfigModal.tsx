import React, { useState, useEffect } from 'react';
import { X, Wifi, WifiOff, Play, Loader2, CheckCircle, AlertCircle, Info, Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { InputField } from '../ui/InputField';
import { autoBackupAPI } from '../../services/api';
import toast from 'react-hot-toast';

interface Equipamento {
  id: number;
  nome: string;
  ip: string;
  tipo: string;
  ssh_enabled?: boolean;
  ssh_port?: number;
  ssh_username?: string;
  ssh_password?: string;
  ssh_private_key?: string;
  http_enabled?: boolean;
  http_port?: number;
  http_protocol?: 'http' | 'https';
  http_username?: string;
  http_password?: string;
  http_ignore_ssl?: boolean;
  auto_backup_enabled?: boolean;
  auto_backup_schedule?: string;
}

interface AutoBackupConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento: Equipamento;
  onSave: (equipamento: Equipamento) => void;
}

interface ConnectivityTest {
  isOnline: boolean;
  sshConnectable?: boolean;
  httpConnectable?: boolean;
  telnetConnectable?: boolean;
  ping: {
    success: boolean;
    time?: number;
    error?: string;
  };
  ssh?: {
    success: boolean;
    error?: string;
  };
  http?: {
    success: boolean;
    error?: string;
  };
  telnet?: {
    success: boolean;
    error?: string;
  };
}

export const AutoBackupConfigModal: React.FC<AutoBackupConfigModalProps> = ({
  isOpen,
  onClose,
  equipamento,
  onSave
}) => {
  const [formData, setFormData] = useState({
    ssh_enabled: false,
    ssh_port: 22,
    ssh_username: '',
    ssh_password: '',
    ssh_private_key: '',
    http_enabled: false,
    http_port: 80,
    http_protocol: 'http' as 'http' | 'https',
    http_username: '',
    http_password: '',
    http_ignore_ssl: false,
    telnet_enabled: false,
    telnet_port: 23,
    telnet_username: '',
    telnet_password: '',
    auto_backup_enabled: false,
    auto_backup_schedule: '0 2 * * *'
  });

  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    hour: 2,
    minute: 0,
    dayOfWeek: 1, // Para semanal (1 = segunda-feira)
    dayOfMonth: 1 // Para mensal
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [connectivity, setConnectivity] = useState<ConnectivityTest | null>(null);
  const [lastTest, setLastTest] = useState<Date | null>(null);

  // Função para converter cron em configuração amigável
  const parseCronToSchedule = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length === 5) {
      const minute = parseInt(parts[0]);
      const hour = parseInt(parts[1]);
      const dayOfMonth = parts[2];
      const month = parts[3];
      const dayOfWeek = parts[4];

      if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
        return { frequency: 'daily' as const, hour, minute, dayOfWeek: 1, dayOfMonth: 1 };
      } else if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
        return { frequency: 'weekly' as const, hour, minute, dayOfWeek: parseInt(dayOfWeek), dayOfMonth: 1 };
      } else if (dayOfMonth !== '*' && month === '*' && dayOfWeek === '*') {
        return { frequency: 'monthly' as const, hour, minute, dayOfWeek: 1, dayOfMonth: parseInt(dayOfMonth) };
      }
    }
    return { frequency: 'daily' as const, hour: 2, minute: 0, dayOfWeek: 1, dayOfMonth: 1 };
  };

  // Função para converter configuração amigável em cron
  const generateCronFromSchedule = (config: typeof scheduleConfig) => {
    const { frequency, hour, minute, dayOfWeek, dayOfMonth } = config;
    
    switch (frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`;
      case 'weekly':
        return `${minute} ${hour} * * ${dayOfWeek}`;
      case 'monthly':
        return `${minute} ${hour} ${dayOfMonth} * *`;
      default:
        return `${minute} ${hour} * * *`;
    }
  };

  useEffect(() => {
    if (equipamento) {
      const schedule = equipamento.auto_backup_schedule || '0 2 * * *';
      const parsedSchedule = parseCronToSchedule(schedule);
      
      // Determinar se equipamento usa HTTP (Mimosa)
      const type = equipamento.tipo.toLowerCase();
      const isMimosa = type.includes('mimosa');
      
      setFormData({
        ssh_enabled: equipamento.ssh_enabled || false,
        ssh_port: equipamento.ssh_port || 22,
        ssh_username: equipamento.ssh_username || '',
        ssh_password: equipamento.ssh_password || '',
        ssh_private_key: equipamento.ssh_private_key || '',
        http_enabled: equipamento.http_enabled || isMimosa,
        http_port: equipamento.http_port || 80,
        http_protocol: equipamento.http_protocol || 'http',
        http_username: equipamento.http_username || '',
        http_password: equipamento.http_password || '',
        http_ignore_ssl: equipamento.http_ignore_ssl || false,
        telnet_enabled: false,
        telnet_port: 23,
        telnet_username: '',
        telnet_password: '',
        auto_backup_enabled: equipamento.auto_backup_enabled || false,
        auto_backup_schedule: schedule
      });
      
      setScheduleConfig(parsedSchedule);
    }
  }, [equipamento]);

  // Atualizar cron quando configuração de agendamento mudar
  useEffect(() => {
    const newCron = generateCronFromSchedule(scheduleConfig);
    setFormData(prev => ({ ...prev, auto_backup_schedule: newCron }));
  }, [scheduleConfig]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await autoBackupAPI.updateConfig(equipamento.id, formData);
      onSave(response.data.equipamento);
      toast.success('Configuração salva com sucesso!');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnectivity = async () => {
    const equipmentInfo = getSupportedEquipmentInfo();
    const type = equipamento.tipo.toLowerCase();
    const isMimosa = type.includes('mimosa');
    
    // Para equipamentos Mimosa, sempre usar HTTP
    if (isMimosa) {
      if (!formData.http_enabled) {
        toast.error('Habilite HTTP primeiro para testar conectividade');
        return;
      }
      if (!formData.http_password) {
        toast.error('Configure senha para testar conectividade HTTP');
        return;
      }
    }
    // Para outros equipamentos, usar lógica original
    else if (equipmentInfo.connectionType === 'ssh') {
      if (!formData.ssh_enabled) {
        toast.error('Habilite SSH primeiro para testar conectividade');
        return;
      }
      if (!formData.ssh_username || (!formData.ssh_password && !formData.ssh_private_key)) {
        toast.error('Configure usuário e senha/chave para testar conectividade');
        return;
      }
    }
    else if (equipmentInfo.connectionType === 'telnet') {
      if (!formData.telnet_enabled) {
        toast.error('Habilite Telnet primeiro para testar conectividade');
        return;
      }
      if (!formData.telnet_username || !formData.telnet_password) {
        toast.error('Configure usuário e senha para testar conectividade Telnet');
        return;
      }
    }
    else if (equipmentInfo.connectionType === 'http') {
      if (!formData.http_enabled) {
        toast.error('Habilite HTTP primeiro para testar conectividade');
        return;
      }
      if (!formData.http_password) {
        toast.error('Configure senha para testar conectividade HTTP');
        return;
      }
    }

    setIsTesting(true);
    try {
      // Primeiro salvar a configuração
      await autoBackupAPI.updateConfig(equipamento.id, formData);

      // Depois testar conectividade
      const response = await autoBackupAPI.testConnectivity(equipamento.id);
      const result = response.data;
      setConnectivity(result.connectivity);
      setLastTest(new Date());

      if (equipmentInfo.connectionType === 'ssh' && result.connectivity.sshConnectable) {
        toast.success('Conectividade SSH confirmada!');
      } else if (equipmentInfo.connectionType === 'telnet' && result.connectivity.telnetConnectable) {
        toast.success('Conectividade Telnet confirmada!');
      } else if (equipmentInfo.connectionType === 'http' && result.connectivity.httpConnectable) {
        toast.success('Conectividade HTTP confirmada!');
      } else {
        toast.error(`Falha na conectividade ${equipmentInfo.connectionType.toUpperCase()}`);
      }
    } catch (error: any) {
      toast.error('Erro ao testar conectividade');
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleExecuteBackup = async () => {
    setIsExecuting(true);
    try {
      const response = await autoBackupAPI.executeBackup(equipamento.id);
      const result = response.data;

      if (result.success) {
        toast.success('Backup executado com sucesso!');
      } else {
        toast.error(`Falha no backup: ${result.error}`);
      }
    } catch (error: any) {
      toast.error('Erro ao executar backup');
    } finally {
      setIsExecuting(false);
    }
  };

  const getSupportedEquipmentInfo = () => {
    const type = equipamento.tipo.toLowerCase();
    if (type.includes('mikrotik')) {
      return {
        supported: true,
        connectionType: 'ssh',
        commands: ['Criar backup binário', 'Exportar configuração', 'Download automático'],
        files: ['.backup', '.rsc']
      };
    } else if (type.includes('ubiquiti')) {
      return {
        supported: true,
        connectionType: 'ssh',
        commands: ['Backup system.cfg', 'Cópia para /tmp', 'Download via SSH'],
        files: ['.cfg']
      };
    } else if (type.includes('huawei') && type.includes('ne20')) {
      return {
        supported: true,
        connectionType: 'telnet',
        commands: ['Salvar configuração', 'Criar backup NE20', 'Backup via Telnet'],
        files: ['.cfg']
      };
    } else if (type.includes('huawei')) {
      return {
        supported: true,
        connectionType: 'ssh',
        commands: ['Salvar configuração', 'Criar backup', 'Download automático'],
        files: ['.cfg']
      };
    } else if (type.includes('fiberhome') || type.includes('olt') && type.includes('fh')) {
      return {
        supported: true,
        connectionType: 'telnet',
        commands: ['Enable mode', 'Config mode', 'Save config', 'Backup database'],
        files: ['.db', '.cfg']
      };
    } else if (type.includes('parks') || (type.includes('olt') && type.includes('parks'))) {
      return {
        supported: true,
        connectionType: 'telnet',
        commands: ['Enable mode', 'Configure terminal', 'Write memory', 'Save running-config'],
        files: ['.cfg']
      };
    } else if (type.includes('mimosa')) {
      return {
        supported: true,
        connectionType: 'http',
        commands: ['Login na interface web', 'Download mimosa.conf', 'Logout automático'],
        files: ['.conf']
      };
    } else {
      return {
        supported: false,
        connectionType: 'ssh',
        commands: [],
        files: [],
        message: 'Tipo de equipamento não suportado para backup automático'
      };
    }
  };

  const equipmentInfo = getSupportedEquipmentInfo();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold">
            Backup Automatizado - {equipamento.nome}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuração de Conexão */}
            <div className="space-y-4">
              {equipmentInfo.connectionType === 'ssh' ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Configuração SSH</h3>
                  <p className="text-sm text-blue-700">
                    Configure o acesso SSH para executar backups automatizados remotamente.
                  </p>
                </div>
              ) : equipmentInfo.connectionType === 'telnet' ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold text-orange-900 mb-2">Configuração Telnet</h3>
                  <p className="text-sm text-orange-700">
                    Configure o acesso Telnet para equipamentos OLT e NE20 legados.
                  </p>
                </div>
              ) : (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">Configuração HTTP</h3>
                  <p className="text-sm text-purple-700">
                    Configure o acesso à interface web para fazer backup da configuração.
                  </p>
                </div>
              )}

              {equipmentInfo.connectionType === 'ssh' ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ssh_enabled"
                    checked={formData.ssh_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, ssh_enabled: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="ssh_enabled" className="text-sm font-medium text-gray-700">
                    Habilitar SSH
                  </label>
                </div>
              ) : equipmentInfo.connectionType === 'telnet' ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="telnet_enabled"
                    checked={formData.telnet_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, telnet_enabled: e.target.checked }))}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="telnet_enabled" className="text-sm font-medium text-gray-700">
                    Habilitar Telnet
                  </label>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="http_enabled"
                    checked={formData.http_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, http_enabled: e.target.checked }))}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="http_enabled" className="text-sm font-medium text-gray-700">
                    Habilitar HTTP
                  </label>
                </div>
              )}

              {/* Configurações SSH */}
              {equipmentInfo.connectionType === 'ssh' && formData.ssh_enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Porta SSH"
                      type="number"
                      value={formData.ssh_port.toString()}
                      onChange={(e) => setFormData(prev => ({ ...prev, ssh_port: parseInt(e.target.value) || 22 }))}
                      placeholder="22"
                    />
                    <InputField
                      label="Usuário SSH"
                      value={formData.ssh_username}
                      onChange={(e) => setFormData(prev => ({ ...prev, ssh_username: e.target.value }))}
                      placeholder="admin"
                      required
                    />
                  </div>

                  <div className="relative">
                    <InputField
                      label="Senha SSH"
                      type={showPassword ? "text" : "password"}
                      value={formData.ssh_password}
                      onChange={(e) => setFormData(prev => ({ ...prev, ssh_password: e.target.value }))}
                      placeholder="Digite a senha SSH"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chave Privada SSH (opcional)
                    </label>
                    <textarea
                      value={formData.ssh_private_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, ssh_private_key: e.target.value }))}
                      placeholder="-----BEGIN PRIVATE KEY-----"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Se fornecida, será usada no lugar da senha
                    </p>
                  </div>
                </div>
              )}

              {/* Configurações Telnet */}
              {equipmentInfo.connectionType === 'telnet' && formData.telnet_enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Porta Telnet"
                      type="number"
                      value={formData.telnet_port.toString()}
                      onChange={(e) => setFormData(prev => ({ ...prev, telnet_port: parseInt(e.target.value) || 23 }))}
                      placeholder="23"
                    />
                    <InputField
                      label="Usuário Telnet"
                      value={formData.telnet_username}
                      onChange={(e) => setFormData(prev => ({ ...prev, telnet_username: e.target.value }))}
                      placeholder="admin"
                      required
                    />
                  </div>

                  <div className="relative">
                    <InputField
                      label="Senha Telnet"
                      type={showPassword ? "text" : "password"}
                      value={formData.telnet_password}
                      onChange={(e) => setFormData(prev => ({ ...prev, telnet_password: e.target.value }))}
                      placeholder="Digite a senha Telnet"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-800">
                      <strong>Telnet (OLTs/NE20):</strong> Porta padrão 23, sem criptografia<br/>
                      <strong>Nota:</strong> Equipamentos legados que requerem conexão Telnet
                    </p>
                  </div>
                </div>
              )}

              {/* Configurações HTTP */}
              {equipmentInfo.connectionType === 'http' && formData.http_enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Protocolo
                      </label>
                      <select
                        value={formData.http_protocol}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          http_protocol: e.target.value as 'http' | 'https',
                          http_port: e.target.value === 'https' ? 443 : 80
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                      </select>
                    </div>
                    <InputField
                      label="Porta HTTP"
                      type="number"
                      value={formData.http_port.toString()}
                      onChange={(e) => setFormData(prev => ({ ...prev, http_port: parseInt(e.target.value) || 80 }))}
                      placeholder="80"
                    />
                    <div className="flex items-center space-x-2 pt-8">
                      <input
                        type="checkbox"
                        id="http_ignore_ssl"
                        checked={formData.http_ignore_ssl}
                        onChange={(e) => setFormData(prev => ({ ...prev, http_ignore_ssl: e.target.checked }))}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="http_ignore_ssl" className="text-xs text-gray-600">
                        Ignorar SSL
                      </label>
                    </div>
                  </div>

                  <div className="relative">
                    <InputField
                      label="Senha da Interface Web"
                      type={showPassword ? "text" : "password"}
                      value={formData.http_password}
                      onChange={(e) => setFormData(prev => ({ ...prev, http_password: e.target.value }))}
                      placeholder="mimosa"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Mimosa padrão:</strong> IP 192.168.1.20, senha "mimosa"<br/>
                      <strong>Nota:</strong> Mimosa só usa senha, sem usuário
                    </p>
                  </div>
                </div>
              )}

              {/* Testes de conectividade */}
              {((equipmentInfo.connectionType === 'ssh' && formData.ssh_enabled) || 
                (equipmentInfo.connectionType === 'http' && formData.http_enabled) ||
                (equipmentInfo.connectionType === 'telnet' && formData.telnet_enabled)) && (
                <div className="space-y-4">
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleTestConnectivity}
                      disabled={isTesting}
                      variant="outline"
                      className="flex items-center space-x-2"
                    >
                      {isTesting ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                      ) : (equipmentInfo.connectionType === 'ssh' ? connectivity?.sshConnectable : 
                           equipmentInfo.connectionType === 'http' ? connectivity?.httpConnectable :
                           equipmentInfo.connectionType === 'telnet' ? connectivity?.telnetConnectable : false) ? (
                        <Wifi className="h-4 w-4 text-green-600" />
                      ) : (
                        <WifiOff className="h-4 w-4" />
                      )}
                      <span>Testar Conectividade</span>
                    </Button>

                    {((equipmentInfo.connectionType === 'ssh' && connectivity?.sshConnectable) || 
                      (equipmentInfo.connectionType === 'http' && connectivity?.httpConnectable) ||
                      (equipmentInfo.connectionType === 'telnet' && connectivity?.telnetConnectable)) && (
                      <Button
                        onClick={handleExecuteBackup}
                        disabled={isExecuting}
                        className="flex items-center space-x-2"
                      >
                        {isExecuting ? (
                          <Loader2 className="animate-spin h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span>Executar Backup Agora</span>
                      </Button>
                    )}
                  </div>

                  {connectivity && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Resultado do Teste</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          {connectivity.ping.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span>
                            Ping: {connectivity.ping.success ? 'Sucesso' : 'Falha'}
                            {connectivity.ping.time && ` (${connectivity.ping.time}ms)`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {equipmentInfo.connectionType === 'ssh' ? (
                            <>
                              {connectivity.ssh?.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span>
                                SSH: {connectivity.ssh?.success ? 'Conectado' : 'Falha'}
                              </span>
                            </>
                          ) : equipmentInfo.connectionType === 'telnet' ? (
                            <>
                              {connectivity.telnet?.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span>
                                Telnet: {connectivity.telnet?.success ? 'Conectado' : 'Falha'}
                              </span>
                            </>
                          ) : (
                            <>
                              {connectivity.http?.success ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span>
                                HTTP: {connectivity.http?.success ? 'Conectado' : 'Falha'}
                              </span>
                            </>
                          )}
                        </div>
                        {lastTest && (
                          <p className="text-xs text-gray-500">
                            Testado em: {lastTest.toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Configuração de Backup Automático */}
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Backup Automatizado</h3>
                <p className="text-sm text-green-700">
                  Configure quando e como os backups automáticos serão executados.
                </p>
              </div>

              {equipmentInfo.supported ? (
                <>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto_backup_enabled"
                      checked={formData.auto_backup_enabled}
                      onChange={(e) => setFormData(prev => ({ ...prev, auto_backup_enabled: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      disabled={
                        (equipmentInfo.connectionType === 'ssh' && !formData.ssh_enabled) ||
                        (equipmentInfo.connectionType === 'http' && !formData.http_enabled) ||
                        (equipmentInfo.connectionType === 'telnet' && !formData.telnet_enabled)
                      }
                    />
                    <label htmlFor="auto_backup_enabled" className="text-sm font-medium text-gray-700">
                      Habilitar Backup Automático
                    </label>
                  </div>

                  {formData.auto_backup_enabled && (
                    <div className="space-y-4">
                      {/* Seletor de Frequência */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Frequência do Backup
                        </label>
                        <select
                          value={scheduleConfig.frequency}
                          onChange={(e) => setScheduleConfig(prev => ({ 
                            ...prev, 
                            frequency: e.target.value as 'daily' | 'weekly' | 'monthly' 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="daily">Diariamente</option>
                          <option value="weekly">Semanalmente</option>
                          <option value="monthly">Mensalmente</option>
                        </select>
                      </div>

                      {/* Seletor de Horário */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Hora
                          </label>
                          <select
                            value={scheduleConfig.hour}
                            onChange={(e) => setScheduleConfig(prev => ({ 
                              ...prev, 
                              hour: parseInt(e.target.value) 
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 24 }, (_, i) => (
                              <option key={i} value={i}>
                                {i.toString().padStart(2, '0')}:00
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minuto
                          </label>
                          <select
                            value={scheduleConfig.minute}
                            onChange={(e) => setScheduleConfig(prev => ({ 
                              ...prev, 
                              minute: parseInt(e.target.value) 
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                              <option key={minute} value={minute}>
                                {minute.toString().padStart(2, '0')}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Dia da Semana (apenas para semanal) */}
                      {scheduleConfig.frequency === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Dia da Semana
                          </label>
                          <select
                            value={scheduleConfig.dayOfWeek}
                            onChange={(e) => setScheduleConfig(prev => ({ 
                              ...prev, 
                              dayOfWeek: parseInt(e.target.value) 
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={1}>Segunda-feira</option>
                            <option value={2}>Terça-feira</option>
                            <option value={3}>Quarta-feira</option>
                            <option value={4}>Quinta-feira</option>
                            <option value={5}>Sexta-feira</option>
                            <option value={6}>Sábado</option>
                            <option value={0}>Domingo</option>
                          </select>
                        </div>
                      )}

                      {/* Dia do Mês (apenas para mensal) */}
                      {scheduleConfig.frequency === 'monthly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Dia do Mês
                          </label>
                          <select
                            value={scheduleConfig.dayOfMonth}
                            onChange={(e) => setScheduleConfig(prev => ({ 
                              ...prev, 
                              dayOfMonth: parseInt(e.target.value) 
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                              <option key={day} value={day}>
                                {day}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Limitado a 28 para evitar problemas em meses menores
                          </p>
                        </div>
                      )}

                      {/* Preview do agendamento */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Agendamento: </span>
                          <span className="text-blue-600">
                            {scheduleConfig.frequency === 'daily' && 
                              `Todo dia às ${scheduleConfig.hour.toString().padStart(2, '0')}:${scheduleConfig.minute.toString().padStart(2, '0')}`
                            }
                            {scheduleConfig.frequency === 'weekly' && 
                              `Todas as ${['Domingos', 'Segundas', 'Terças', 'Quartas', 'Quintas', 'Sextas', 'Sábados'][scheduleConfig.dayOfWeek]} às ${scheduleConfig.hour.toString().padStart(2, '0')}:${scheduleConfig.minute.toString().padStart(2, '0')}`
                            }
                            {scheduleConfig.frequency === 'monthly' && 
                              `Todo dia ${scheduleConfig.dayOfMonth} do mês às ${scheduleConfig.hour.toString().padStart(2, '0')}:${scheduleConfig.minute.toString().padStart(2, '0')}`
                            }
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Cron: <code className="bg-gray-200 px-1 rounded">{formData.auto_backup_schedule}</code>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                          <Info className="h-4 w-4 mr-2" />
                          Scripts de Backup para {equipamento.tipo}
                        </h4>
                        <div className="space-y-2 text-sm text-blue-800">
                          <div>
                            <span className="font-medium">Comandos executados:</span>
                            <ul className="list-disc list-inside ml-2 mt-1">
                              {equipmentInfo.commands?.map((command, index) => (
                                <li key={index}>{command}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="font-medium">Arquivos gerados:</span>
                            <div className="flex space-x-2 mt-1">
                              {equipmentInfo.files?.map((file, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                  {file}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Equipamento não suportado
                      </p>
                      <p className="text-sm text-yellow-700">
                        {equipmentInfo.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t flex-shrink-0 bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            isLoading={isLoading}
          >
            Salvar Configuração
          </Button>
        </div>
      </div>
    </div>
  );
};