import React from 'react';
import { FileText, Info, CheckCircle } from 'lucide-react';

interface FileTypeInfoProps {
  showInfo?: boolean;
  selectedEquipmentType?: string;
}

export const FileTypeInfo: React.FC<FileTypeInfoProps> = ({ 
  showInfo = true, 
  selectedEquipmentType 
}) => {
  const equipmentTypes = {
    'Mikrotik': {
      extensions: ['.rsc', '.export', '.backup', '.cfg'],
      description: 'Arquivos de configuração e backup do Mikrotik RouterOS',
      examples: ['export.rsc', 'backup.backup', 'config.cfg']
    },
    'Ubiquiti': {
      extensions: ['.cfg', '.json', '.backup', '.unf'],
      description: 'Arquivos de configuração Ubiquiti UniFi/EdgeMax',
      examples: ['config.cfg', 'settings.json', 'backup.unf']
    },
    'Mimosa': {
      extensions: ['.cfg', '.json', '.backup'],
      description: 'Arquivos de configuração Mimosa',
      examples: ['config.cfg', 'settings.json', 'backup.backup']
    },
    'Huawei NE': {
      extensions: ['.cfg', '.dat', '.zip', '.tar', '.xml', '.backup'],
      description: 'Arquivos de configuração Huawei Network Elements',
      examples: ['config.cfg', 'data.dat', 'backup.zip', 'settings.xml']
    },
    'OLT FiberHome': {
      extensions: ['.cfg', '.db', '.backup', '.dat', '.xml'],
      description: 'Arquivos de configuração OLT FiberHome',
      examples: ['config.cfg', 'database.db', 'backup.dat', 'settings.xml']
    },
    'OLT Parks': {
      extensions: ['.cfg', '.backup', '.dat', '.xml'],
      description: 'Arquivos de configuração OLT Parks',
      examples: ['config.cfg', 'backup.dat', 'settings.xml']
    }
  };

  const genericExtensions = ['.zip', '.tar.gz', '.bak', '.backup', '.cfg'];

  if (!showInfo) return null;

  const renderEquipmentInfo = (name: string, info: any) => (
    <div key={name} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center mb-2">
        <FileText className="h-5 w-5 text-blue-600 mr-2" />
        <h4 className="font-semibold text-gray-900">{name}</h4>
      </div>
      <p className="text-sm text-gray-600 mb-3">{info.description}</p>
      <div className="space-y-2">
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Extensões aceitas:
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {info.extensions.map((ext: string) => (
              <span key={ext} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {ext}
              </span>
            ))}
          </div>
        </div>
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Exemplos:
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            {info.examples.map((example: string) => (
              <span key={example} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-mono">
                {example}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <Info className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="font-semibold text-blue-900">Tipos de Arquivo Suportados</h3>
      </div>
      
      {selectedEquipmentType && equipmentTypes[selectedEquipmentType as keyof typeof equipmentTypes] ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center mb-2">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-800">
                Configuração específica para {selectedEquipmentType}
              </span>
            </div>
            {renderEquipmentInfo(selectedEquipmentType, equipmentTypes[selectedEquipmentType as keyof typeof equipmentTypes])}
          </div>
          
          <div className="border-t border-blue-200 pt-3">
            <span className="text-sm font-medium text-blue-800 mb-2 block">
              Formatos genéricos também aceitos:
            </span>
            <div className="flex flex-wrap gap-1">
              {genericExtensions.map((ext) => (
                <span key={ext} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {ext}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(equipmentTypes).map(([name, info]) => 
              renderEquipmentInfo(name, info)
            )}
          </div>
          
          <div className="border-t border-blue-200 pt-3">
            <span className="text-sm font-medium text-blue-800 mb-2 block">
              Formatos genéricos aceitos:
            </span>
            <div className="flex flex-wrap gap-1">
              {genericExtensions.map((ext) => (
                <span key={ext} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                  {ext}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Nota:</strong> O sistema detecta automaticamente o tipo de arquivo baseado no nome e extensão. 
          Arquivos incompatíveis com o tipo de equipamento selecionado serão rejeitados.
        </p>
      </div>
    </div>
  );
};