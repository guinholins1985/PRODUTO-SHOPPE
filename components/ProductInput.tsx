
import React, { useState, useRef, useCallback } from 'react';
import UploadIcon from './icons/UploadIcon';
import SparklesIcon from './icons/SparklesIcon';
import ImageIcon from './icons/ImageIcon';
import LinkIcon from './icons/LinkIcon';
import { GenerationStep } from '../App';

interface ProductInputProps {
  onGenerate: (image: File | null, title: string, url: string) => void;
  generationStep: GenerationStep;
}

const ProductInput: React.FC<ProductInputProps> = ({ onGenerate, generationStep }) => {
  const [inputType, setInputType] = useState<'image' | 'link'>('image');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [url, setUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = generationStep === 'content' || generationStep === 'images';

  const handleFileChange = useCallback((files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, [handleFileChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputType === 'image' && !imageFile && !title) {
      alert('Por favor, envie uma imagem ou digite um título.');
      return;
    }
    if (inputType === 'link' && !url) {
      alert('Por favor, insira um link do produto.');
      return;
    }
    onGenerate(
        inputType === 'image' ? imageFile : null, 
        title, 
        inputType === 'link' ? url : ''
    );
  };

  const getButtonText = () => {
    if (generationStep === 'content') return 'Gerando Conteúdo...';
    if (generationStep === 'images') return 'Gerando Imagens...';
    return 'Gerar Conteúdo';
  }
  
  const tabBaseClasses = "flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors focus:outline-none";
  const activeTabClasses = "bg-gray-700/50 text-white";
  const inactiveTabClasses = "text-gray-400 hover:bg-gray-700/30 hover:text-gray-200";

  return (
    <div className="w-full lg:w-1/2 p-6 bg-gray-800/50 rounded-2xl border border-gray-700 backdrop-blur-sm self-start sticky top-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-100">1. Forneça os Detalhes do Produto</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="flex bg-gray-900/70 p-1 rounded-lg border border-gray-700">
            <button type="button" onClick={() => setInputType('image')} className={`${tabBaseClasses} rounded-l-md ${inputType === 'image' ? activeTabClasses : inactiveTabClasses}`}>
                <ImageIcon className="w-5 h-5"/> Gerar de Imagem
            </button>
             <button type="button" onClick={() => setInputType('link')} className={`${tabBaseClasses} rounded-r-md ${inputType === 'link' ? activeTabClasses : inactiveTabClasses}`}>
                <LinkIcon className="w-5 h-5"/> Gerar de Link
            </button>
        </div>

        {inputType === 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Faça upload da imagem do produto
              </label>
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex justify-center items-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${isDragging ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-600 hover:border-indigo-500 hover:bg-gray-800'}`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e.target.files)}
                  className="hidden"
                  accept="image/*"
                />
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" />
                ) : (
                  <div className="text-center text-gray-500">
                    <UploadIcon className="mx-auto h-12 w-12" />
                    <p>Arraste e solte ou clique para enviar</p>
                  </div>
                )}
              </div>
            </div>
        )}

        {inputType === 'link' && (
             <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-400 mb-2">
                Cole o link do produto ou anúncio
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo.com/produto-xyz"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
            </div>
        )}
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-2">
            Insira palavras-chave para refinar (opcional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Tênis de corrida, para homens, preto"
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {getButtonText()}
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              {getButtonText()}
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ProductInput;
