import React, { useState, useEffect } from 'react';
import { Calendar, Tag, Clock, User, Globe, Mail, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { api } from '../services/api';

interface ChangelogItem {
  version: string;
  date: string;
  type: 'release' | 'hotfix' | 'update';
  title: string;
  description: string;
  features: string[];
  improvements: string[];
  fixes: string[];
}

interface RoadmapItem {
  version: string;
  estimatedDate: string;
  title: string;
  features: string[];
}

interface SystemInfo {
  name: string;
  description: string;
  author: string;
  license: string;
  website?: string;
  support?: string;
}

interface UpdatesData {
  version: string;
  build: string;
  releaseDate: string;
  changelog: ChangelogItem[];
  roadmap: RoadmapItem[];
  systemInfo: SystemInfo;
}

export function UpdatesPage() {
  const [updates, setUpdates] = useState<UpdatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/updates');
      setUpdates(response.data);
    } catch (err) {
      console.error('Erro ao carregar atualizações:', err);
      setError('Não foi possível carregar as informações de atualizações');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'release':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'hotfix':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'update':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Tag className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (type) {
      case 'release':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'hotfix':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'update':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando informações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!updates) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Atualizações do Sistema</h1>
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              v{updates.version}
            </span>
            <span className="text-sm text-gray-500">Build {updates.build}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <Tag className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{updates.systemInfo.name}</p>
              <p className="text-xs text-gray-500">{updates.systemInfo.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Última Atualização</p>
              <p className="text-xs text-gray-500">{formatDate(updates.releaseDate)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">{updates.systemInfo.author}</p>
              <p className="text-xs text-gray-500">{updates.systemInfo.license}</p>
            </div>
          </div>
        </div>

        {(updates.systemInfo.website || updates.systemInfo.support) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-6">
              {updates.systemInfo.website && (
                <a 
                  href={updates.systemInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Globe className="h-4 w-4" />
                  <span>Website</span>
                </a>
              )}
              {updates.systemInfo.support && (
                <a 
                  href={`mailto:${updates.systemInfo.support}`}
                  className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Mail className="h-4 w-4" />
                  <span>Suporte</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Changelog */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Histórico de Versões</h2>
        
        <div className="space-y-6">
          {updates.changelog.map((item, index) => (
            <div key={index} className="border-l-4 border-blue-200 pl-6 pb-6 last:pb-0">
              <div className="flex items-center space-x-3 mb-3">
                {getTypeIcon(item.type)}
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <span className={getTypeBadge(item.type)}>
                  {item.type}
                </span>
                <span className="text-sm text-gray-500">v{item.version}</span>
              </div>
              
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(item.date)}</span>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{item.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {item.features.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-800 mb-2">✨ Novos Recursos</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {item.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {item.improvements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">🚀 Melhorias</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {item.improvements.map((improvement, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-blue-600 mt-1">•</span>
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {item.fixes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">🐛 Correções</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {item.fixes.map((fix, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-red-600 mt-1">•</span>
                          <span>{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      {updates.roadmap.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Próximas Versões</h2>
          
          <div className="space-y-6">
            {updates.roadmap.map((item, index) => (
              <div key={index} className="border-l-4 border-yellow-200 pl-6 pb-6 last:pb-0">
                <div className="flex items-center space-x-3 mb-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    v{item.version}
                  </span>
                </div>
                
                <div className="flex items-center space-x-1 text-sm text-gray-500 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>Previsão: {formatDate(item.estimatedDate)}</span>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Recursos Planejados</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {item.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-yellow-600 mt-1">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}