import path from 'path';

export interface FileTypeInfo {
  equipment: string;
  description: string;
  extensions: string[];
  mimeTypes: string[];
}

export const EQUIPMENT_FILE_TYPES: Record<string, FileTypeInfo> = {
  mikrotik: {
    equipment: 'Mikrotik',
    description: 'Arquivos de configuração e backup do Mikrotik RouterOS',
    extensions: ['.rsc', '.export', '.backup', '.cfg'],
    mimeTypes: ['text/plain', 'application/octet-stream']
  },
  ubiquiti: {
    equipment: 'Ubiquiti',
    description: 'Arquivos de configuração Ubiquiti UniFi/EdgeMax',
    extensions: ['.cfg', '.json', '.backup', '.unf'],
    mimeTypes: ['application/json', 'text/plain', 'application/octet-stream']
  },
  mimosa: {
    equipment: 'Mimosa',
    description: 'Arquivos de configuração Mimosa',
    extensions: ['.cfg', '.json', '.backup'],
    mimeTypes: ['application/json', 'text/plain', 'application/octet-stream']
  },
  huawei: {
    equipment: 'Huawei NE',
    description: 'Arquivos de configuração Huawei Network Elements',
    extensions: ['.cfg', '.dat', '.zip', '.tar', '.xml', '.backup'],
    mimeTypes: ['text/xml', 'application/zip', 'application/x-tar', 'application/octet-stream']
  },
  fiberhome: {
    equipment: 'FiberHome OLT',
    description: 'Arquivos de configuração OLT FiberHome',
    extensions: ['.cfg', '.db', '.backup', '.dat', '.xml'],
    mimeTypes: ['text/xml', 'application/octet-stream', 'application/x-sqlite3']
  },
  parks: {
    equipment: 'Parks OLT',
    description: 'Arquivos de configuração OLT Parks',
    extensions: ['.cfg', '.backup', '.dat', '.xml'],
    mimeTypes: ['text/xml', 'application/octet-stream']
  }
};

export class FileTypeDetector {
  /**
   * Detecta o tipo de equipamento baseado no nome do arquivo
   */
  static detectEquipmentType(filename: string): string | null {
    const ext = path.extname(filename).toLowerCase();
    const name = filename.toLowerCase();
    
    // Verificar padrões específicos no nome do arquivo
    if (name.includes('mikrotik') || name.includes('routeros') || ext === '.rsc') {
      return 'mikrotik';
    }
    
    if (name.includes('ubiquiti') || name.includes('unifi') || name.includes('edgemax') || ext === '.unf') {
      return 'ubiquiti';
    }
    
    if (name.includes('mimosa')) {
      return 'mimosa';
    }
    
    if (name.includes('huawei') || name.includes('ne40') || name.includes('ne80') || name.includes('ne5000')) {
      return 'huawei';
    }
    
    if (name.includes('fiberhome') || name.includes('olt') && name.includes('fh')) {
      return 'fiberhome';
    }
    
    if (name.includes('parks') || name.includes('olt') && name.includes('parks')) {
      return 'parks';
    }
    
    // Verificar por extensão
    for (const [type, info] of Object.entries(EQUIPMENT_FILE_TYPES)) {
      if (info.extensions.includes(ext)) {
        return type;
      }
    }
    
    return null;
  }
  
  /**
   * Valida se o arquivo é compatível com o tipo de equipamento
   */
  static validateFileForEquipment(filename: string, equipmentType: string): boolean {
    const detectedType = this.detectEquipmentType(filename);
    
    if (!detectedType) {
      // Se não conseguir detectar, permitir arquivos genéricos
      const genericExtensions = ['.zip', '.tar.gz', '.bak', '.backup', '.cfg'];
      const ext = path.extname(filename).toLowerCase();
      return genericExtensions.includes(ext);
    }
    
    // Verificar compatibilidade
    const equipmentTypeNormalized = equipmentType.toLowerCase();
    
    if (equipmentTypeNormalized.includes('mikrotik') && detectedType === 'mikrotik') return true;
    if (equipmentTypeNormalized.includes('ubiquiti') && detectedType === 'ubiquiti') return true;
    if (equipmentTypeNormalized.includes('mimosa') && detectedType === 'mimosa') return true;
    if (equipmentTypeNormalized.includes('huawei') && detectedType === 'huawei') return true;
    if (equipmentTypeNormalized.includes('fiberhome') && detectedType === 'fiberhome') return true;
    if (equipmentTypeNormalized.includes('parks') && detectedType === 'parks') return true;
    
    // Permitir qualquer arquivo para tipos genéricos
    const genericTypes = ['router', 'switch', 'firewall', 'access point', 'servidor', 'modem', 'outros'];
    return genericTypes.includes(equipmentTypeNormalized);
  }
  
  /**
   * Obtém informações sobre o tipo de arquivo
   */
  static getFileTypeInfo(filename: string): FileTypeInfo | null {
    const type = this.detectEquipmentType(filename);
    return type ? EQUIPMENT_FILE_TYPES[type] : null;
  }
  
  /**
   * Lista todos os tipos de arquivo suportados
   */
  static getSupportedExtensions(): string[] {
    const extensions = new Set<string>();
    
    // Adicionar extensões específicas
    for (const info of Object.values(EQUIPMENT_FILE_TYPES)) {
      info.extensions.forEach(ext => extensions.add(ext));
    }
    
    // Adicionar extensões genéricas
    ['.zip', '.tar.gz', '.bak', '.backup'].forEach(ext => extensions.add(ext));
    
    return Array.from(extensions).sort();
  }
}