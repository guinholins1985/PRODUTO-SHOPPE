import React, { useState, useRef, useCallback } from 'react';
import UploadIcon from './icons/UploadIcon';
import SparklesIcon from './icons/SparklesIcon';
import { GenerationStep } from '../App';

interface ProductInputProps {
  onGenerate: (image: File | null, title: string) => void;
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

  const isLoading = generationStep === 'content' || generationStep === 'images';

  const handleFileChange = useCallback(async (files: FileList | null) => { // Made async
    if (files && files[0]) {
      const originalFile = files[0];
      try {
        // Resize the image to prevent timeouts and speed up processing. Max dimension 1024px.
        const resizedFile = await resizeImage(originalFile, 1024);
        
        setImageFile(resizedFile);

        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(resizedFile);
        
        // Automatically trigger content generation on file upload.
        onGenerate(resizedFile, title);

      } catch (error) {
        console.error("Error resizing image:", error);
        alert("Houve um erro ao processar a imagem. Por favor, tente um arquivo diferente.");
      }
    }
  }, [onGenerate, title]);

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
    if (!imageFile && !title) {
      alert('Por favor, envie uma imagem ou digite um título.');
      return;
    }
    onGenerate(imageFile, title);
  };

  const getButtonText = () => {
    if (generationStep === 'content') return 'Gerando Conteúdo...';
    if (generationStep === 'images') return 'Gerando Imagens...';
    return 'Gerar Anúncio Completo';
  }

  return (
    <section className="w-full max-w-4xl p-4 sm:p-6 bg-gray-800/50 rounded-2xl border border-gray-700 backdrop-blur-sm">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-100">1. Envie seu Produto</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Faça upload da imagem do produto
          </label>
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex justify-center items-center w-full h-48 sm:h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${isDragging ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-600 hover:border-indigo-500 hover:bg-gray-800'}`}
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
                <p className="text-xs mt-1">A geração começará automaticamente</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-2">
            Ou insira palavras-chave para refinar (opcional)
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
    </section>
  );
};

export default ProductInput;