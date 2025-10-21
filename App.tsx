import React, { useState } from 'react';
import ProductInput from './components/ProductInput';
import ProductOutput from './components/ProductOutput';
import { generateProductContent, generateProductImages, generateProductMockups } from './services/geminiService';
import { ProductContent, GeneratedProductImage } from './types';

// This type is used to track the UI state through the generation process.
export type GenerationStep = 'idle' | 'content' | 'images' | 'error' | 'done';

const App: React.FC = () => {
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [productContent, setProductContent] = useState<ProductContent | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedProductImage>(null);
  const [generatedMockups, setGeneratedMockups] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);

  const handleGenerate = async (image: File | null, title: string) => {
    // Reset state for a new generation
    setProductContent(null);
    setGeneratedImage(null);
    setGeneratedMockups([]);
    setError(null);
    setGenerationStep('content');
    
    if (originalImagePreview) {
      URL.revokeObjectURL(originalImagePreview);
    }

    if (image) {
      setOriginalImagePreview(URL.createObjectURL(image));
    } else {
      setOriginalImagePreview(null);
    }

    try {
      if (image) {
        // --- IMAGE-BASED GENERATION (SEQUENTIAL FLOW FOR STABILITY) ---

        // 1. Generate content first.
        const content = await generateProductContent(image, title);
        setProductContent(content);
        
        // Update UI to show content is ready and images are now being generated.
        setGenerationStep('images');

        // 2. Generate the main product image.
        const newImage = await generateProductImages(image);
        setGeneratedImage(newImage);

        // If the main image fails, we can't create mockups. We stop here.
        if (!newImage) {
          setGenerationStep('done');
          return;
        }

        // 3. With the main image ready, generate mockups.
        const mockups = await generateProductMockups(newImage, content);
        setGeneratedMockups(mockups);

        setGenerationStep('done');

      } else {
        // --- TEXT-ONLY GENERATION ---
        const content = await generateProductContent(null, title);
        setProductContent(content);
        setGenerationStep('done');
      }

    } catch (err) {
      console.error(err);
      let errorMessage = 'A API parece estar sobrecarregada ou instável. Por favor, tente novamente em alguns instantes.';
      
      if (err instanceof Error) {
        if (err.message.includes('política de segurança')) {
          errorMessage = 'Sua solicitação foi bloqueada por nossa política de segurança. Tente usar uma imagem ou texto diferente.';
        } else if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
          errorMessage = 'Muitas solicitações foram feitas em um curto período. Por favor, aguarde um momento e tente novamente.';
        } else if (err.message.includes('formato inválido')) {
          errorMessage = 'A IA retornou uma resposta em formato inesperado. Isso pode ser um problema temporário. Tente novamente.';
        }
      }
      
      setError(errorMessage);
      setGenerationStep('error');
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <header className="py-6 px-4 sm:px-8 border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-center">MEGA ANUNCIO</h1>
        <p className="text-center text-gray-400 mt-2 text-sm sm:text-base">Crie descrições, títulos e imagens para seus produtos em segundos.</p>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8 items-start">
        <ProductInput onGenerate={handleGenerate} generationStep={generationStep} />
        <ProductOutput 
          content={productContent} 
          generationStep={generationStep} 
          error={error} 
          generatedImage={generatedImage}
          generatedMockups={generatedMockups}
        />
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        Powered by Google Gemini API
      </footer>
    </div>
  );
};

export default App;
