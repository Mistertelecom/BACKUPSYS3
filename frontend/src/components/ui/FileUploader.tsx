import { useState, useRef } from 'react';
import { Upload, X, File } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  acceptedTypes?: string[];
  maxSizeInMB?: number;
  className?: string;
}

export function FileUploader({ 
  onFileSelect, 
  onFileRemove, 
  selectedFile, 
  acceptedTypes = ['.zip', '.tar.gz', '.bak'],
  maxSizeInMB = 100,
  className 
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!acceptedTypes.includes(fileExtension)) {
      alert(`Tipo de arquivo não aceito. Permitidos: ${acceptedTypes.join(', ')}`);
      return;
    }

    if (file.size > maxSizeInMB * 1024 * 1024) {
      alert(`Arquivo muito grande. Máximo: ${maxSizeInMB}MB`);
      return;
    }

    onFileSelect(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {selectedFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <File className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={onFileRemove}
              className="p-1 hover:bg-red-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-red-500" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            {
              'border-blue-500 bg-blue-50': isDragOver,
              'border-gray-300 hover:border-gray-400': !isDragOver,
            }
          )}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Clique para selecionar ou arraste o arquivo
          </p>
          <p className="text-sm text-gray-500">
            Tipos aceitos: {acceptedTypes.join(', ')} (máx. {maxSizeInMB}MB)
          </p>
        </div>
      )}
    </div>
  );
}