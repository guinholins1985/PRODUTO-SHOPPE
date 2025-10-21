
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
        // --- IMAGE-BASED GENERATION ---

        // 1. Generate content and main image in parallel for performance.
        const [content, newImage] = await Promise.all([
          generateProductContent(image, title),
          generateProductImages(image)
        ]);
        
        setProductContent(content);
        setGeneratedImage(newImage);
        setGenerationStep('images'); // Transition to loading secondary images (mockups, banner)

        // If the main image fails to generate, we can't create mockups or a banner.
        if (!newImage) {
          setGenerationStep('done');
          return;
        }

        // 2. With the main image ready, generate mockups and the coupon banner in parallel.
        const secondaryImageTasks: Promise<any>[] = [];
        
        secondaryImageTasks.push(
          generateProductMockups(newImage, content).then(setGeneratedMockups)
        );
        
        await Promise.all(secondaryImageTasks);

        setGenerationStep('done');

      } else {
        // --- TEXT-ONLY GENERATION ---
        const content = await generateProductContent(null, title);
        setProductContent(content);
        setGenerationStep('done');
      }

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
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