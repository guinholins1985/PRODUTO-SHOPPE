import React, { useState } from 'react';
import ProductInput from './components/ProductInput';
import ProductOutput from './components/ProductOutput';
import { generateProductContent, generateProductImages } from './services/geminiService';
import { ProductContent, GeneratedImageSet } from './types';

// This type is used to track the UI state through the generation process.
export type GenerationStep = 'idle' | 'content' | 'images' | 'error' | 'done';

const App: React.FC = () => {
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [productContent, setProductContent] = useState<ProductContent | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageSet>({ withText: [], clean: [], modern: [] });
  const [error, setError] = useState<string | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);

  const handleGenerate = async (image: File | null, title: string, url: string) => {
    // Reset state for a new generation
    setProductContent(null);
    setGeneratedImages({ withText: [], clean: [], modern: [] });
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
      // 1. Generate Product Content (description, keywords, etc.)
      const content = await generateProductContent(image, title, url);
      setProductContent(content);

      // 2. Generate Product Images by editing the original, if one was provided
      if (image) {
        setGenerationStep('images');
        const images = await generateProductImages(content, image);
        setGeneratedImages(images);
      }

      setGenerationStep('done');

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setGenerationStep('error');
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <header className="py-6 px-8 border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-3xl font-bold text-center">MEGA ANUNCIO</h1>
        <p className="text-center text-gray-400 mt-2">Crie descrições, títulos e imagens para seus produtos em segundos.</p>
      </header>
      <main className="container mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-start">
        <ProductInput onGenerate={handleGenerate} generationStep={generationStep} />
        <ProductOutput 
          content={productContent} 
          generationStep={generationStep} 
          error={error} 
          originalImagePreview={originalImagePreview} 
          generatedImages={generatedImages}
        />
      </main>
      <footer className="text-center py-4 text-gray-500 text-sm">
        Powered by Google Gemini API
      </footer>
    </div>
  );
};

export default App;