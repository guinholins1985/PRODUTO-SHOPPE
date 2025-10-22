import React, { useState, useRef, useCallback, useEffect } from 'react';
import UploadIcon from './icons/UploadIcon';
import SparklesIcon from './icons/SparklesIcon';
import { GenerationStep } from '../App';

interface ProductInputProps {
  onGenerate: (image: File | null, title: string, imagePrompt?: string) => void;
  generationStep: GenerationStep;
}

// Utility function to resize images client-side for performance.
const resizeImage = (file: File, maxDimension: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (!event.target?.result) {
          return reject(new Error("Failed to read file."));
      }
      const img = new Image();
      img.src = event.target.result as string;
      img.onload = () => {
        const { width, height } = img;

        // If the image is already small enough, no need to resize.
        if (width <= maxDimension && height <= maxDimension) {
          return resolve(file);
        }

        let newWidth, newHeight;

        if (width > height) {
          newWidth = maxDimension;
          newHeight = (height * maxDimension) / width;
        } else {
          newHeight = maxDimension;
          newWidth = (width * maxDimension) / height;
        }

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }

        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert canvas to blob, then to file.
        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Canvas to Blob conversion failed'));
          }
          // Preserve the original file name, but use a more common type for web.
          const outputType = 'image/jpeg';
          const resizedFile = new File([blob], file.name, {
            type: outputType,
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        }, 'image/jpeg', 0.9); // Use JPEG with 90% quality for good compression.
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};


const ProductInput: React.FC<ProductInputProps> = ({ onGenerate, generationStep }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'generate'>('upload');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUrlLoading, setIsUrlLoading] = useState(false);


  const isLoading = generationStep === 'base_image' || generationStep === 'content' || generationStep === 'images';

  const switchMode = useCallback((newMode: 'upload' | 'generate') => {
    if (isLoading) return; // Prevent switching while loading.
    if (newMode === 'generate') {
      setImageFile(null);
      setImagePreview(null);
      setImageUrl('');
    }
    setMode(newMode);
  }, [isLoading]);

  const processImageFile = useCallback(async (file: File) => {
    try {
        const resizedFile = await resizeImage(file, 1024);
        
        setImageFile(resizedFile);
        setImageUrl(''); // Clear URL input if successful
        setImagePrompt('');
        
        if (mode !== 'upload') {
            setMode('upload');
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(resizedFile);
        
        // --- AUTOMATIC GENERATION TRIGGER ---
        onGenerate(resizedFile, title, undefined);

    } catch (error) {
        console.error("Error processing image:", error);
        alert("Houve um erro ao processar a imagem. Por favor, tente um arquivo ou URL diferente.");
    }
  }, [onGenerate, title, mode]);


  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (files && files[0]) {
      await processImageFile(files[0]);
    }
  }, [processImageFile]);
  
  const handleUrlLoad = useCallback(async () => {
    if (!imageUrl) {
        alert('Por favor, insira uma URL de imagem.');
        return;
    }
    try {
      new URL(imageUrl);
    } catch (_) {
      alert('Por favor, insira uma URL válida.');
      return;
    }

    setIsUrlLoading(true);
    try {
        // NOTE: Fetching images from arbitrary URLs can be blocked by CORS policy.
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Falha ao buscar imagem (status: ${response.status})`);
        }
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
            throw new Error('A URL não contém um tipo de imagem válido.');
        }
        
        const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1).split('?')[0] || 'image-from-url.png';
        const imageFileFromUrl = new File([blob], filename, { type: blob.type });

        await processImageFile(imageFileFromUrl);

    } catch (error) {
        console.error("Error fetching image from URL:", error);
        alert(`Houve um erro ao carregar a imagem da URL: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Verifique a URL e as permissões de CORS do servidor da imagem.`);
    } finally {
        setIsUrlLoading(false);
    }
  }, [imageUrl, processImageFile]);


  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (mode === 'upload' && !isLoading) setIsDragging(true);
  }, [mode, isLoading]);
  
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (mode === 'upload' && !isLoading) {
      handleFileChange(e.dataTransfer.files);
    }
  }, [handleFileChange, mode, isLoading]);

  const getGenerationStatusText = () => {
    if (generationStep === 'base_image') return 'Gerando Imagem Base...';
    if (generationStep === 'content') return 'Analisando e Gerando Conteúdo...';
    if (generationStep === 'images') return 'Criando Imagens de Marketing...';
    return 'Iniciando Geração...';
  }

  return (
    <section className="relative w-full max-w-4xl p-4 sm:p-6 bg-gray-800/50 rounded-2xl border border-gray-700 backdrop-blur-sm">
        {isLoading && (
            <div className="absolute inset-0 bg-gray-800/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl animate-fade-in">
                <svg className="animate-spin h-8 w-8 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-lg font-semibold">{getGenerationStatusText()}</p>
            </div>
        )}

      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-100">1. Envie seu Produto</h2>
      
      <div className="flex bg-gray-900 border border-gray-700 rounded-lg p-1 max-w-sm mx-auto mb-6">
        <button onClick={() => switchMode('upload')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition ${mode === 'upload' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
          Enviar Imagem
        </button>
        <button onClick={() => switchMode('generate')} className={`w-1/2 py-2 text-sm font-semibold rounded-md transition ${mode === 'generate' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
          Gerar com IA
        </button>
      </div>

      <div className="space-y-6">
        {mode === 'upload' ? (
          <div className="animate-fade-in">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Faça upload da imagem do produto
            </label>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={`flex justify-center items-center w-full h-48 sm:h-64 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragging ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-600'} ${!isLoading ? 'cursor-pointer hover:border-indigo-500 hover:bg-gray-800' : 'cursor-not-allowed'}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileChange(e.target.files)}
                className="hidden"
                accept="image/*"
                disabled={isLoading}
              />
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-full w-full object-contain rounded-lg p-2" />
              ) : (
                <div className="text-center text-gray-500">
                  <UploadIcon className="mx-auto h-12 w-12" />
                  <p>Arraste e solte ou clique para enviar</p>
                  <p className="text-xs mt-1">A geração do anúncio começará automaticamente.</p>
                </div>
              )}
            </div>
            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-sm uppercase">Ou</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-400 mb-2">
                Cole a URL da imagem
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  disabled={isLoading || isUrlLoading}
                  className="flex-grow px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={handleUrlLoad}
                  disabled={isLoading || isUrlLoading}
                  className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed transition-colors duration-300 w-28"
                >
                  {isUrlLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : 'Carregar'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label htmlFor="imagePrompt" className="block text-sm font-medium text-gray-400 mb-2">
                Descreva a imagem que você deseja criar
              </label>
              <textarea
                  id="imagePrompt"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Ex: Tênis de corrida masculino, vermelho com detalhes brancos, em um fundo de estúdio limpo e branco."
                  rows={4}
                  disabled={isLoading}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:opacity-50"
              />
            </div>
             <button
                type="button"
                onClick={() => {
                    if (!imagePrompt) {
                        alert('Por favor, descreva a imagem que você deseja criar.');
                        return;
                    }
                    onGenerate(null, title, imagePrompt);
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
            >
                <SparklesIcon className="w-5 h-5" />
                Gerar Imagem e Anúncio
            </button>
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-2">
            Insira palavras-chave para refinar o conteúdo (opcional)
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Confortável, para maratonas, design moderno"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:opacity-50"
          />
        </div>
      </div>
    </section>
  );
};

export default ProductInput;