import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, UserCheck, UserX, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

interface User {
  id: number;
  username: string;
  role: string;
  role_description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

interface UserFormData {
  username: string;
  password: string;
  role: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    role: 'readonly'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPermissions, setShowPermissions] = useState<number | null>(null);

  const { token, user: currentUser } = useAuthStore();

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao carregar usuários');
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/users/roles/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      toast.error('Username é obrigatório');
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error('Password é obrigatório para novos usuários');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      toast.error('Password deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      
      const payload: any = {
        username: formData.username,
        role: formData.role
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        loadUsers();
        closeModal();
      } else {
        toast.error(data.error || 'Erro ao salvar usuário');
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast.error('Erro ao salvar usuário');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role
    });
    setShowModal(true);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Tem certeza que deseja deletar o usuário "${user.username}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        loadUsers();
      } else {
        toast.error(data.error || 'Erro ao deletar usuário');
      }
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      toast.error('Erro ao deletar usuário');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        loadUsers();
      } else {
        toast.error(data.error || 'Erro ao alterar status do usuário');
      }
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'readonly'
    });
    setShowPassword(false);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'download':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'readonly':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className=\"min-h-screen bg-gray-50 flex items-center justify-center\">
        <div className=\"animate-spin rounded-full h-32 w-32 border-b-2 border-black\"></div>
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-gray-50 p-6\">
      <div className=\"max-w-7xl mx-auto\">
        <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">
          <div className=\"flex items-center justify-between mb-6\">
            <div>
              <h1 className=\"text-2xl font-bold text-gray-900\">Gerenciamento de Usuários</h1>
              <p className=\"text-gray-600 mt-1\">Administre usuários e suas permissões no sistema</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className=\"bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2\"
            >
              <Plus className=\"w-4 h-4\" />
              Novo Usuário
            </button>
          </div>

          <div className=\"overflow-x-auto\">
            <table className=\"w-full\">
              <thead>
                <tr className=\"border-b border-gray-200\">
                  <th className=\"text-left py-3 px-4 font-medium text-gray-900\">Usuário</th>
                  <th className=\"text-left py-3 px-4 font-medium text-gray-900\">Role</th>
                  <th className=\"text-left py-3 px-4 font-medium text-gray-900\">Status</th>
                  <th className=\"text-left py-3 px-4 font-medium text-gray-900\">Criado em</th>
                  <th className=\"text-center py-3 px-4 font-medium text-gray-900\">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className=\"border-b border-gray-100 hover:bg-gray-50\">
                    <td className=\"py-3 px-4\">
                      <div className=\"flex items-center gap-3\">
                        <div className=\"w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-medium\">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className=\"font-medium text-gray-900\">{user.username}</div>
                          {user.username === 'admin' && (
                            <div className=\"text-xs text-gray-500\">Administrador Principal</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className=\"py-3 px-4\">
                      <div className=\"flex items-center gap-2\">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                        <button
                          onClick={() => setShowPermissions(showPermissions === user.id ? null : user.id)}
                          className=\"text-gray-400 hover:text-gray-600\"
                          title=\"Ver permissões\"
                        >
                          <Eye className=\"w-4 h-4\" />
                        </button>
                      </div>
                      {showPermissions === user.id && (
                        <div className=\"mt-2 p-2 bg-gray-50 rounded text-xs\">
                          <div className=\"font-medium text-gray-700 mb-1\">{user.role_description}</div>
                          {roles.find(r => r.name === user.role)?.permissions.map((perm, idx) => (
                            <span key={idx} className=\"inline-block bg-white px-1 py-0.5 rounded text-xs text-gray-600 mr-1 mb-1\">
                              {perm}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className=\"py-3 px-4\">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className=\"py-3 px-4 text-gray-600\">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className=\"py-3 px-4\">
                      <div className=\"flex items-center justify-center gap-2\">
                        <button
                          onClick={() => handleEdit(user)}
                          className=\"text-blue-600 hover:text-blue-800 p-1\"
                          title=\"Editar\"
                        >
                          <Edit className=\"w-4 h-4\" />
                        </button>
                        
                        {user.username !== 'admin' && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`p-1 ${user.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}
                              title={user.is_active ? 'Desativar' : 'Ativar'}
                            >
                              {user.is_active ? <UserX className=\"w-4 h-4\" /> : <UserCheck className=\"w-4 h-4\" />}
                            </button>
                            
                            <button
                              onClick={() => handleDelete(user)}
                              className=\"text-red-600 hover:text-red-800 p-1\"
                              title=\"Deletar\"
                            >
                              <Trash2 className=\"w-4 h-4\" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className=\"text-center py-8 text-gray-500\">
              Nenhum usuário encontrado
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className=\"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50\">
          <div className=\"bg-white rounded-lg p-6 w-full max-w-md\">
            <h2 className=\"text-xl font-bold text-gray-900 mb-4\">
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            
            <form onSubmit={handleSubmit} className=\"space-y-4\">
              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Username
                </label>
                <input
                  type=\"text\"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black\"
                  required
                />
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Password {editingUser && '(deixe em branco para manter)'}
                </label>
                <div className=\"relative\">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black pr-10\"
                    required={!editingUser}
                    minLength={6}
                  />
                  <button
                    type=\"button\"
                    onClick={() => setShowPassword(!showPassword)}
                    className=\"absolute right-3 top-2.5 text-gray-400 hover:text-gray-600\"
                  >
                    <Eye className=\"w-4 h-4\" />
                  </button>
                </div>
              </div>

              <div>
                <label className=\"block text-sm font-medium text-gray-700 mb-1\">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black\"
                >
                  {roles.map((role) => (
                    <option key={role.name} value={role.name}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className=\"flex justify-end gap-3 pt-4\">
                <button
                  type=\"button\"
                  onClick={closeModal}
                  className=\"px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50\"
                >
                  Cancelar
                </button>
                <button
                  type=\"submit\"
                  className=\"px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800\"
                >
                  {editingUser ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;