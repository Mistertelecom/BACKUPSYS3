import { Link, useLocation } from 'react-router-dom';
import { Home, Server, HardDrive, LogOut, Settings, Shield, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Equipamentos', href: '/equipamentos', icon: Server },
  { name: 'Backups', href: '/backups', icon: HardDrive },
  { name: 'Providers', href: '/providers', icon: Settings },
  { name: 'Integração', href: '/integration', icon: Shield },
];

const adminNavigation = [
  { name: 'Usuários', href: '/users', icon: Users },
];

export function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-gray-900 font-bold text-lg">Y</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Y BACK</h1>
            <p className="text-xs text-gray-400">Sistema de Backup</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                {
                  'bg-gray-800 text-white shadow-lg': isActive,
                  'text-gray-300 hover:bg-gray-700 hover:text-white': !isActive,
                }
              )}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Admin Navigation */}
        {user?.role === 'admin' && (
          <>
            <div className="pt-4 pb-2">
              <div className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Administração
              </div>
            </div>
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200',
                    {
                      'bg-gray-800 text-white shadow-lg': isActive,
                      'text-gray-300 hover:bg-gray-700 hover:text-white': !isActive,
                    }
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gray-600 rounded-xl flex items-center justify-center">
            <span className="text-sm font-medium">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.username}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role || 'Usuário'}</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl transition-all duration-200"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}