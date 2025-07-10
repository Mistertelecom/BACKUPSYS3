import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Settings } from 'lucide-react';
import { Provider } from '../types/provider';
import { providersAPI } from '../services/api';
import { ProviderCard } from '../components/cards/ProviderCard';
import { ProviderForm } from '../components/forms/ProviderForm';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import toast from 'react-hot-toast';

export const ProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | undefined>();

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, searchTerm, selectedType, selectedStatus]);

  const fetchProviders = async () => {
    try {
      const response = await providersAPI.getAll();
      setProviders(response.data);
    } catch (error) {
      console.error('Erro ao buscar providers:', error);
      toast.error('Erro ao carregar providers');
    } finally {
      setIsLoading(false);
    }
  };

  const filterProviders = () => {
    let filtered = providers;

    if (searchTerm) {
      filtered = filtered.filter(provider =>
        provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(provider => provider.type === selectedType);
    }

    if (selectedStatus !== 'all') {
      const isActive = selectedStatus === 'active';
      filtered = filtered.filter(provider => provider.is_active === isActive);
    }

    setFilteredProviders(filtered);
  };

  const handleCreateProvider = () => {
    setSelectedProvider(undefined);
    setShowForm(true);
  };

  const handleEditProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setShowForm(true);
  };

  const handleSaveProvider = (savedProvider: Provider) => {
    if (selectedProvider) {
      // Update existing provider
      setProviders(prev => 
        prev.map(p => p.id === savedProvider.id ? savedProvider : p)
      );
    } else {
      // Add new provider
      setProviders(prev => [savedProvider, ...prev]);
    }
    setShowForm(false);
    setSelectedProvider(undefined);
  };

  const handleDeleteProvider = (providerId: number) => {
    setProviders(prev => prev.filter(p => p.id !== providerId));
  };

  const handleToggleActive = (providerId: number) => {
    setProviders(prev => 
      prev.map(p => 
        p.id === providerId ? { ...p, is_active: !p.is_active } : p
      )
    );
  };

  const getProviderTypeOptions = () => {
    const types = Array.from(new Set(providers.map(p => p.type)));
    return types.map(type => ({
      value: type,
      label: type === 'aws-s3' ? 'AWS S3' : 
            type === 'gcs' ? 'Google Cloud Storage' : 
            type === 'local' ? 'Local Storage' : type
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers de Backup</h1>
          <p className="text-gray-600">Gerencie os provedores de armazenamento para backups</p>
        </div>
        <Button
          onClick={handleCreateProvider}
          className="flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Novo Provider</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <InputField
                placeholder="Buscar por nome ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={20} className="text-gray-500" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os tipos</option>
              {getProviderTypeOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Providers</p>
              <p className="text-2xl font-bold text-gray-900">{providers.length}</p>
            </div>
            <Settings className="text-blue-500" size={24} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Providers Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {providers.filter(p => p.is_active).length}
              </p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Local Storage</p>
              <p className="text-2xl font-bold text-gray-600">
                {providers.filter(p => p.type === 'local').length}
              </p>
            </div>
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cloud Providers</p>
              <p className="text-2xl font-bold text-blue-600">
                {providers.filter(p => p.type !== 'local').length}
              </p>
            </div>
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Providers Grid */}
      {filteredProviders.length === 0 ? (
        <div className="text-center py-12">
          <Settings className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
              ? 'Nenhum provider encontrado'
              : 'Nenhum provider cadastrado'
            }
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedType !== 'all' || selectedStatus !== 'all'
              ? 'Tente ajustar os filtros para encontrar providers'
              : 'Comece criando seu primeiro provider de backup'
            }
          </p>
          {!searchTerm && selectedType === 'all' && selectedStatus === 'all' && (
            <Button onClick={handleCreateProvider}>
              <Plus size={20} className="mr-2" />
              Criar Primeiro Provider
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map(provider => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onEdit={handleEditProvider}
              onDelete={handleDeleteProvider}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      {/* Provider Form Modal */}
      {showForm && (
        <ProviderForm
          provider={selectedProvider}
          onClose={() => {
            setShowForm(false);
            setSelectedProvider(undefined);
          }}
          onSave={handleSaveProvider}
        />
      )}
    </div>
  );
};