import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Search, Server } from 'lucide-react';
import { equipamentosAPI } from '../services/api';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EquipamentoForm } from '../components/forms/EquipamentoForm';
import { EquipamentoCard } from '../components/cards/EquipamentoCard';

interface Equipamento {
  id: number;
  nome: string;
  ip: string;
  tipo: string;
  created_at: string;
  backup_count: number;
}

interface EquipamentoFormData {
  nome: string;
  ip: string;
  tipo: string;
}

export function EquipamentosPage() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [filteredEquipamentos, setFilteredEquipamentos] = useState<Equipamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<Equipamento | null>(null);
  const [showBackupsModal, setShowBackupsModal] = useState(false);
  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null);
  const [equipamentoBackups, setEquipamentoBackups] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEquipamentos = async () => {
    try {
      setIsLoading(true);
      const response = await equipamentosAPI.getAll();
      setEquipamentos(response.data);
      setFilteredEquipamentos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar equipamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEquipamentoBackups = async (equipamentoId: number) => {
    try {
      const response = await equipamentosAPI.getBackups(equipamentoId);
      setEquipamentoBackups(response.data);
    } catch (error) {
      toast.error('Erro ao carregar backups do equipamento');
    }
  };

  useEffect(() => {
    fetchEquipamentos();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredEquipamentos(equipamentos);
    } else {
      const filtered = equipamentos.filter(eq =>
        eq.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.ip.includes(searchTerm) ||
        eq.tipo.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEquipamentos(filtered);
    }
  }, [searchTerm, equipamentos]);

  const handleCreate = async (data: EquipamentoFormData) => {
    setIsSubmitting(true);
    try {
      await equipamentosAPI.create(data);
      toast.success('Equipamento criado com sucesso!');
      setShowCreateModal(false);
      fetchEquipamentos();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao criar equipamento';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (equipamento: Equipamento) => {
    setEditingEquipamento(equipamento);
    setShowEditModal(true);
  };

  const handleUpdate = async (data: EquipamentoFormData) => {
    if (!editingEquipamento) return;

    setIsSubmitting(true);
    try {
      await equipamentosAPI.update(editingEquipamento.id, data);
      toast.success('Equipamento atualizado com sucesso!');
      setShowEditModal(false);
      setEditingEquipamento(null);
      fetchEquipamentos();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao atualizar equipamento';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await equipamentosAPI.delete(id);
      toast.success('Equipamento excluído com sucesso!');
      fetchEquipamentos();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao excluir equipamento';
      toast.error(errorMessage);
    }
  };

  const handleViewBackups = async (equipamento: Equipamento) => {
    setSelectedEquipamento(equipamento);
    setShowBackupsModal(true);
    await fetchEquipamentoBackups(equipamento.id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
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
        <h1 className="text-2xl font-bold text-gray-900">Equipamentos</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Equipamento
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, IP ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {filteredEquipamentos.length} equipamento(s) encontrado(s)
        </div>
      </div>

      {filteredEquipamentos.length === 0 ? (
        <div className="text-center py-12">
          <Server className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Nenhum equipamento encontrado' : 'Nenhum equipamento cadastrado'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchTerm 
              ? 'Tente ajustar sua busca ou limpar o filtro'
              : 'Comece adicionando seu primeiro equipamento'
            }
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Equipamento
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipamentos.map((equipamento) => (
            <EquipamentoCard
              key={equipamento.id}
              equipamento={equipamento}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewBackups={handleViewBackups}
            />
          ))}
        </div>
      )}

      {/* Modal Criar Equipamento */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Equipamento"
        size="lg"
      >
        <EquipamentoForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          isLoading={isSubmitting}
          submitLabel="Criar Equipamento"
        />
      </Modal>

      {/* Modal Editar Equipamento */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEquipamento(null);
        }}
        title="Editar Equipamento"
        size="lg"
      >
        {editingEquipamento && (
          <EquipamentoForm
            initialData={editingEquipamento}
            onSubmit={handleUpdate}
            onCancel={() => {
              setShowEditModal(false);
              setEditingEquipamento(null);
            }}
            isLoading={isSubmitting}
            submitLabel="Atualizar Equipamento"
          />
        )}
      </Modal>

      {/* Modal Ver Backups */}
      <Modal
        isOpen={showBackupsModal}
        onClose={() => {
          setShowBackupsModal(false);
          setSelectedEquipamento(null);
          setEquipamentoBackups([]);
        }}
        title={`Backups - ${selectedEquipamento?.nome}`}
        size="xl"
      >
        {selectedEquipamento && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Nome:</span> {selectedEquipamento.nome}
                </div>
                <div>
                  <span className="font-medium">IP:</span> {selectedEquipamento.ip}
                </div>
                <div>
                  <span className="font-medium">Tipo:</span> {selectedEquipamento.tipo}
                </div>
                <div>
                  <span className="font-medium">Total de Backups:</span> {selectedEquipamento.backup_count}
                </div>
              </div>
            </div>

            {equipamentoBackups.length === 0 ? (
              <div className="text-center py-8">
                <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum backup encontrado para este equipamento</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {equipamentoBackups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{backup.nome_arquivo}</p>
                      <p className="text-sm text-gray-500">
                        Enviado em: {formatDate(backup.data_upload)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Download functionality would be implemented here
                        toast('Funcionalidade de download será implementada', { icon: 'ℹ️' });
                      }}
                    >
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}