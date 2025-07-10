import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button';
import { InputField } from '../ui/InputField';

interface EquipamentoFormData {
  nome: string;
  ip: string;
  tipo: string;
}

interface EquipamentoFormProps {
  initialData?: EquipamentoFormData;
  onSubmit: (data: EquipamentoFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function EquipamentoForm({ 
  initialData = { nome: '', ip: '', tipo: '' }, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  submitLabel = 'Salvar'
}: EquipamentoFormProps) {
  const [formData, setFormData] = useState<EquipamentoFormData>(initialData);
  const [errors, setErrors] = useState<Partial<EquipamentoFormData>>({});

  const validateForm = () => {
    const newErrors: Partial<EquipamentoFormData> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.ip.trim()) {
      newErrors.ip = 'IP é obrigatório';
    } else {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(formData.ip)) {
        newErrors.ip = 'IP inválido';
      }
    }

    if (!formData.tipo.trim()) {
      newErrors.tipo = 'Tipo é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Erro ao salvar equipamento';
      toast.error(errorMessage);
    }
  };

  const handleChange = (field: keyof EquipamentoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField
        label="Nome do Equipamento"
        value={formData.nome}
        onChange={(e) => handleChange('nome', e.target.value)}
        error={errors.nome}
        placeholder="Ex: Router Principal"
        required
      />

      <InputField
        label="Endereço IP"
        value={formData.ip}
        onChange={(e) => handleChange('ip', e.target.value)}
        error={errors.ip}
        placeholder="Ex: 192.168.1.1"
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Equipamento
        </label>
        <select
          value={formData.tipo}
          onChange={(e) => handleChange('tipo', e.target.value)}
          className="input"
          required
        >
          <option value="">Selecione o tipo</option>
          <optgroup label="Equipamentos de Rede">
            <option value="Router">Router</option>
            <option value="Switch">Switch</option>
            <option value="Firewall">Firewall</option>
            <option value="Access Point">Access Point</option>
            <option value="Modem">Modem</option>
          </optgroup>
          <optgroup label="Equipamentos Específicos">
            <option value="Mikrotik">Mikrotik</option>
            <option value="Ubiquiti">Ubiquiti</option>
            <option value="Mimosa">Mimosa</option>
            <option value="Huawei NE">Huawei NE*</option>
            <option value="OLT FiberHome">OLT FiberHome</option>
            <option value="OLT Parks">OLT Parks</option>
          </optgroup>
          <optgroup label="Outros">
            <option value="Servidor">Servidor</option>
            <option value="Outros">Outros</option>
          </optgroup>
        </select>
        {errors.tipo && (
          <p className="mt-1 text-sm text-red-600">{errors.tipo}</p>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}