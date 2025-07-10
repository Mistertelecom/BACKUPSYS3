import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  
  const { login, isLoading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: { username?: string; password?: string } = {};
    
    if (!username.trim()) {
      newErrors.username = 'Username é obrigatório';
    }
    
    if (!password.trim()) {
      newErrors.password = 'Password é obrigatório';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      await login({ username, password });
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao fazer login';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <span className="text-gray-900 font-bold text-3xl">Y</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Y BACK</h1>
          <p className="text-gray-400 text-sm">Sistema de Backup para Equipamentos</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl border border-gray-200">
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 text-center mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-gray-600 text-center text-sm">
                Faça login para acessar o sistema
              </p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <InputField
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={errors.username}
                placeholder="Digite seu username"
                autoComplete="username"
              />

              <InputField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                size="lg"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  Credenciais de teste
                </p>
                <p className="text-xs text-blue-600">
                  Usuário: <span className="font-mono font-medium">admin</span> • 
                  Senha: <span className="font-mono font-medium">admin123</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-xs">
            © 2024 Y BACK. Sistema profissional de backup.
          </p>
        </div>
      </div>
    </div>
  );
}