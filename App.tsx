
import React, { useState, useCallback } from 'react';
import ProductInput from './components/ProductInput';
import ProductOutput from './components/ProductOutput';
import { ProductContent } from './types';
import { generateProductContent, generateProductImages } from './services/geminiService';
import SparklesIcon from './components/icons/SparklesIcon';

export type GenerationStep = 'idle' | 'content' | 'images' | 'done' | 'error';

function App() {
  const [productContent, setProductContent] = useState<ProductContent | null>(null);
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleGenerateImages = useCallback(async (content: ProductContent) => {
    if (!content) return;
    setGenerationStep('images');
    try {
      const images = await generateProductImages(content.name, content.description);
      setGeneratedImages(images);
      setGenerationStep('done');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao gerar as imagens.');
      setGenerationStep('error');
    }
  }, []);

  const handleGenerate = useCallback(async (image: File | null, title: string) => {
    setGenerationStep('content');
    setError(null);
    setProductContent(null);
    setGeneratedImages([]);

    if (image) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(image);
    } else {
        setImagePreview(null);
    }

    try {
      const content = await generateProductContent(image, title);
      setProductContent(content);
      await handleGenerateImages(content); // Chain image generation
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
      setGenerationStep('error');
    }
  }, [handleGenerateImages]);


  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <div 
        className="absolute top-0 left-0 w-full h-full bg-cover bg-center opacity-10"
        style={{backgroundImage: 'radial-gradient(circle at top right, rgb(127, 29, 29) 0%, rgb(127, 29, 29) 10%,rgb(17, 24, 39) 10%, rgb(17, 24, 39) 100%)'}}
      ></div>
      <div className="relative container mx-auto px-4 py-8 md:py-16">
        <header className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
                <SparklesIcon className="w-8 h-8 text-indigo-400"/>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
                    E-Commerce Content Genie
                </h1>
            </div>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Automatize a criação de títulos, descrições e tags para seus produtos. Basta enviar uma imagem ou um título e deixar a nossa IA fazer o resto.
          </p>
        </header>

        <main className="flex flex-col lg:flex-row gap-8 items-start">
          <ProductInput onGenerate={handleGenerate} generationStep={generationStep} />
          <ProductOutput 
            content={productContent} 
            generationStep={generationStep}
            error={error} 
            originalImagePreview={imagePreview}
            generatedImages={generatedImages}
          />
        </main>
        <footer className="text-center mt-12 text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} E-Commerce Content Genie. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
