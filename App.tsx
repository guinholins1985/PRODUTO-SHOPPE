import React, { useState } from 'react';
import ProductInput from './components/ProductInput';
import ProductOutput from './components/ProductOutput';
import { generateProductContent, generateProductImages, generateProductMockups, generateImageFromText } from './services/geminiService';
import { ProductContent, GeneratedProductImage } from './types';
import SparklesIcon from './components/icons/SparklesIcon';
import AdminPanel from './components/AdminPanel';
import LockIcon from './components/icons/LockIcon';

// This type is used to track the UI state through the generation process.
export type GenerationStep = 'idle' | 'base_image' | 'content' | 'images' | 'error' | 'done';
type View = 'app' | 'admin';

const Header: React.FC = () => (
    <header className="sticky top-0 z-10 bg-gray-900/50 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="h-6 w-6 text-indigo-400" />
                    <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                        MEGA ANÚNCIO
                    </span>
                </div>
            </div>
        </div>
    </header>
);

const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], fileName, { type: blob.type });
};

const App: React.FC = () => {
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [productContent, setProductContent] = useState<ProductContent | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedProductImage>(null);
  const [generatedMockups, setGeneratedMockups] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [view, setView] = useState<View>('app');

  const handleGenerate = async (image: File | null, title: string, imagePrompt?: string) => {
    // Reset state for a new generation
    setProductContent(null);
    setGeneratedImage(null);
    setGeneratedMockups([]);
    setError(null);

    if (originalImagePreview) {
      URL.revokeObjectURL(originalImagePreview);
      setOriginalImagePreview(null);
    }

    let imageToProcess: File | null = image;

    try {
      if (!imageToProcess && imagePrompt) {
        setGenerationStep('base_image');
        const generatedDataUrl = await generateImageFromText(imagePrompt);
        imageToProcess = await dataUrlToFile(generatedDataUrl, 'generated-image.png');
      }

      if (imageToProcess) {
        setOriginalImagePreview(URL.createObjectURL(imageToProcess));
      }

      setGenerationStep('content');

      if (imageToProcess) {
        // --- IMAGE-BASED GENERATION (SEQUENTIAL FLOW FOR STABILITY) ---

        // 1. Generate content first.
        const content = await generateProductContent(imageToProcess, title);
        setProductContent(content);
        
        // Update UI to show content is ready and images are now being generated.
        setGenerationStep('images');

        // 2. Generate the main product image.
        const newImage = await generateProductImages(imageToProcess);
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
        if (err.message.includes('API Key não configurada')) {
          errorMessage = 'A chave de API não foi configurada. Peça a um administrador para adicioná-la no painel de admin.';
        } else if (err.message.includes('política de segurança')) {
          errorMessage = 'Sua solicitação foi bloqueada por nossa política de segurança. Tente usar uma imagem ou texto diferente.';
        } else if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
          errorMessage = 'Muitas solicitações foram feitas em um curto período. Por favor, aguarde um momento e tente novamente.';
        } else if (err.message.includes('formato inválido')) {
          errorMessage = 'A IA retornou uma resposta em formato inesperado. Isso pode ser um problema temporário. Tente novamente.';
        } else if (err.message.toLowerCase().includes('permission denied') || err.message.toLowerCase().includes('api key not valid')) {
          errorMessage = 'Falha ao chamar a API Gemini: a chave de API é inválida ou não tem permissão. Verifique a chave no painel de admin.';
        }
      }
      
      setError(errorMessage);
      setGenerationStep('error');
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <Header />
      <main className="container mx-auto px-4 py-8 sm:py-12">
        {view === 'app' ? (
          <>
            <section className="text-center max-w-4xl mx-auto mb-12 sm:mb-16">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                    O Futuro do Anúncio de Produtos
                </h1>
                <p className="mt-4 text-lg sm:text-xl text-gray-300">
                    Transforme uma foto ou ideia em um anúncio completo. <span className="font-semibold text-white">Instantaneamente.</span>
                </p>
                <p className="mt-2 text-gray-400 max-w-2xl mx-auto">
                    Gere títulos, descrições, imagens de marketing e roteiros de vídeo com o poder da IA. Otimizado para vender mais.
                </p>
                 <a href="#app-section" className="mt-8 inline-flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105 duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 animate-pulse-slow">
                    <SparklesIcon className="w-5 h-5" />
                    Comece a Criar Agora
                </a>
            </section>

            <div id="app-section" className="flex flex-col items-center gap-8">
                <ProductInput onGenerate={handleGenerate} generationStep={generationStep} />
                <ProductOutput 
                    content={productContent} 
                    generationStep={generationStep} 
                    error={error} 
                    generatedImage={generatedImage}
                    generatedMockups={generatedMockups}
                />
            </div>
          </>
        ) : (
          <AdminPanel onBackToApp={() => setView('app')} />
        )}
      </main>

      <footer className="text-center py-6 text-gray-500 text-sm">
        <span>Powered by Google Gemini API</span>
      </footer>

      {view === 'app' && (
        <button
          onClick={() => setView('admin')}
          className="fixed bottom-5 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800/50 text-gray-400 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-indigo-600 hover:text-white border border-gray-700 animate-pulse-fab"
          aria-label="Abrir Painel do Administrador"
          title="Painel do Administrador"
        >
          <LockIcon className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};

export default App;