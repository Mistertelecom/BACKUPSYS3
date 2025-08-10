import { useState, useCallback } from 'react';
import { api } from '../services/api';

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  updateType: 'major' | 'minor' | 'patch' | 'commit';
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string;
  commits?: Array<{
    sha: string;
    commit: {
      message: string;
      author: {
        name: string;
        date: string;
      };
    };
    html_url: string;
  }>;
}

export interface SystemInfo {
  version: string;
  commit: string;
  branch: string;
  lastUpdate: string;
  nodeVersion: string;
  platform: string;
  uptime: number;
}

export function useUpdates() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/updates/github/check');
      
      if (response.data.success) {
        setUpdateInfo(response.data.data);
      } else {
        throw new Error(response.data.error || 'Erro ao verificar atualizações');
      }
    } catch (err: any) {
      console.error('Erro ao verificar atualizações:', err);
      setError(err.response?.data?.message || err.message || 'Erro ao verificar atualizações');
    } finally {
      setLoading(false);
    }
  }, []);

  const getSystemInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/updates/github/system-info');
      
      if (response.data.success) {
        setSystemInfo(response.data.data);
      } else {
        throw new Error(response.data.error || 'Erro ao obter informações do sistema');
      }
    } catch (err: any) {
      console.error('Erro ao obter informações do sistema:', err);
      setError(err.response?.data?.message || err.message || 'Erro ao obter informações do sistema');
    } finally {
      setLoading(false);
    }
  }, []);

  const createBackup = useCallback(async (): Promise<{ success: boolean; backupPath?: string; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/updates/github/backup');
      
      if (response.data.success) {
        return {
          success: true,
          backupPath: response.data.data.backupPath
        };
      } else {
        throw new Error(response.data.error || 'Erro ao criar backup');
      }
    } catch (err: any) {
      console.error('Erro ao criar backup:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Erro ao criar backup';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const applyUpdate = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setUpdating(true);
      setError(null);
      
      const response = await api.post('/updates/github/apply');
      
      if (response.data.success) {
        // Atualizar informações após aplicar update
        setTimeout(() => {
          checkForUpdates();
          getSystemInfo();
        }, 2000);
        
        return { success: true };
      } else {
        throw new Error(response.data.error || 'Erro ao aplicar atualização');
      }
    } catch (err: any) {
      console.error('Erro ao aplicar atualização:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Erro ao aplicar atualização';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setUpdating(false);
    }
  }, [checkForUpdates, getSystemInfo]);

  const restartSystem = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/updates/github/restart');
      
      if (response.data.success) {
        return { success: true };
      } else {
        throw new Error(response.data.error || 'Erro ao reiniciar sistema');
      }
    } catch (err: any) {
      console.error('Erro ao reiniciar sistema:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Erro ao reiniciar sistema';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUpdateHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/updates/github/history');
      
      if (response.data.success) {
        return response.data.data.commits;
      } else {
        throw new Error(response.data.error || 'Erro ao obter histórico');
      }
    } catch (err: any) {
      console.error('Erro ao obter histórico:', err);
      setError(err.response?.data?.message || err.message || 'Erro ao obter histórico');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const formatUpdateType = (type: string) => {
    switch (type) {
      case 'major':
        return 'Versão Principal';
      case 'minor':
        return 'Versão Secundária';
      case 'patch':
        return 'Correção';
      case 'commit':
        return 'Atualização de Código';
      default:
        return 'Atualização';
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return {
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
    getUpdateHistory,
    formatUpdateType,
    getUpdateTypeColor,
    formatDate
  };
}