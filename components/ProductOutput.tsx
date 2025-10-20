import React, { useState, useEffect } from 'react';
import { ProductContent, ProductVariation, GeneratedProductImage } from '../types';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';
import TrashIcon from './icons/TrashIcon';
import { GenerationStep } from '../App';
import ImageEditor from './ImageEditor';

interface ProductOutputProps {
  content: ProductContent | null;
  generationStep: GenerationStep;
  error: string | null;
  generatedImage: GeneratedProductImage;
  generatedMockups: string[];
  generatedCouponBanner: GeneratedProductImage;
}

const useCopyToClipboard = (text: string) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return { copied, copy };
};

const SuggestionItem: React.FC<{ text: string }> = ({ text }) => {
  const { copied, copy } = useCopyToClipboard(text);
  return (
    <li className="relative flex items-center p-3 pl-4 pr-12 bg-gray-900 border border-gray-700 rounded-lg">
      <span className="text-gray-300 text-sm">{text}</span>
      <button onClick={copy} className="absolute right-2 p-2 text-gray-400 hover:text-white transition">
        {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
      </button>
    </li>
  );
};


const EditableField: React.FC<{ label: string; value: string; isTextarea?: boolean, type?: string }> = ({ label, value, isTextarea = false, type = 'text' }) => {
  const [currentValue, setCurrentValue] = useState(value);
  const { copied, copy } = useCopyToClipboard(currentValue);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const InputComponent = isTextarea ? 'textarea' : 'input';
  const hasLabel = label && label.length > 0;

  return (
    <div className="relative w-full">
      {hasLabel && <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>}
      <InputComponent
        type={type}
        value={currentValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCurrentValue(e.target.value)}
        className={`w-full p-3 pr-10 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${isTextarea ? 'min-h-[150px]' : ''}`}
        rows={isTextarea ? 6 : undefined}
      />
      <button onClick={copy} className={`absolute right-2 p-1 text-gray-400 hover:text-white transition ${hasLabel ? 'top-10' : 'top-3'}`}>
        {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
      </button>
    </div>
  );
};

const SkeletonLoader: React.FC<{ className?: string }> = ({ className = 'h-4' }) => (
  <div className={`bg-gray-700 rounded animate-pulse ${className}`}></div>
);

const ImageResult: React.FC<{
  title: string;
  imageSrc: string | null;
  isLoading: boolean;
  onImageClick: (src: string) => void;
  aspectRatio?: string;
}> = ({ title, imageSrc, isLoading, onImageClick, aspectRatio = 'aspect-square' }) => {
  return (
    <div className="text-center">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={title}
          className={`${aspectRatio} w-full object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity mb-2 border-2 border-transparent hover:border-indigo-500`}
          onClick={() => onImageClick(imageSrc)}
        />
      ) : (
        <div className={`${aspectRatio} w-full bg-gray-800 rounded-md flex items-center justify-center text-center text-xs text-gray-500 p-2`}>
          {isLoading ? 'Gerando...' : 'Falha na Geração'}
        </div>
      )}
      <h4 className="text-sm font-semibold text-gray-400">{title}</h4>
    </div>
  );
};

const PlacementSuggestions: React.FC<{ suggestions: string }> = ({ suggestions }) => {
  const steps = suggestions.split('\n').filter(line => line.trim() !== '');

  return (
      <div className="space-y-4">
          {steps.map((step, index) => {
              const match = step.match(/^(?:\d+\.\s*)?(.+?):(.+)/);
              
              if (match) {
                  const [, title, description] = match;
                  return (
                      <div key={index} className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                          </div>
                          <div>
                              <h4 className="font-semibold text-gray-200">{title.trim()}</h4>
                              <p className="text-gray-400 text-sm">{description.trim()}</p>
                          </div>
                      </div>
                  );
              }
              
              return (
                  <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                      </div>
                      <p className="text-gray-400 text-sm pt-1">{step.replace(/^\d+\.\s*/, '')}</p>
                  </div>
              );
          })}
      </div>
  );
};


const ProductOutput: React.FC<ProductOutputProps> = ({ content, generationStep, error, generatedImage, generatedMockups, generatedCouponBanner }) => {
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [editorConfig, setEditorConfig] = useState<{isOpen: boolean; image: string | null}>({isOpen: false, image: null});

  useEffect(() => {
    setVariations(content?.variations || []);
  }, [content]);

  const handleVariationChange = (index: number, field: keyof ProductVariation, value: string) => {
    const newVariations = [...variations];
    const updatedVariation = { ...newVariations[index] };

    if (field === 'stock' || field === 'price') {
        const numValue = value === '' ? undefined : Number(value.replace(',', '.'));
        (updatedVariation as any)[field] = isNaN(numValue!) ? undefined : numValue;
    } else {
        (updatedVariation as any)[field] = value;
    }
    
    newVariations[index] = updatedVariation;
    setVariations(newVariations);
  };

  const addVariation = () => {
    setVariations([...variations, { color: '', size: '', stock: undefined, price: undefined }]);
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };


  const renderContent = () => {
    const isLoading = generationStep === 'content' || generationStep === 'images';
    const areImagesLoading = generationStep === 'images';

    if (isLoading && !content) {
      return (
        <div className="space-y-6">
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                <SkeletonLoader className="h-5 w-1/3" />
                <SkeletonLoader className="h-10 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SkeletonLoader className="h-10 w-full" />
                    <SkeletonLoader className="h-10 w-full" />
                    <SkeletonLoader className="h-10 w-full" />
                </div>
            </div>
            
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                 <SkeletonLoader className="h-5 w-1/4" />
                 <SkeletonLoader className="h-40 w-full" />
            </div>

            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                <SkeletonLoader className="h-5 w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-4">
                      <SkeletonLoader className="h-4 w-1/4" />
                      <SkeletonLoader className="h-10 w-full" />
                      <SkeletonLoader className="h-4 w-1/4" />
                      <SkeletonLoader className="h-10 w-full" />
                  </div>
                  <SkeletonLoader className="aspect-video w-full rounded-lg" />
                </div>
            </div>
            
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
              <SkeletonLoader className="h-5 w-1/3" />
              <div className="space-y-4">
                  <SkeletonLoader className="h-10 w-full" />
                  <SkeletonLoader className="h-10 w-full" />
                  <SkeletonLoader className="h-10 w-full" />
                  <SkeletonLoader className="h-10 w-full" />
              </div>
            </div>

            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                <SkeletonLoader className="h-5 w-1/3" />
                <div className="max-w-md mx-auto">
                    <SkeletonLoader className="aspect-square w-full" />
                </div>
            </div>

            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                <SkeletonLoader className="h-5 w-1/3" />
                <div className="grid grid-cols-2 gap-4">
                    <SkeletonLoader className="aspect-square w-full" />
                    <SkeletonLoader className="aspect-square w-full" />
                    <SkeletonLoader className="aspect-square w-full" />
                    <SkeletonLoader className="aspect-square w-full" />
                </div>
            </div>

            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                <SkeletonLoader className="h-5 w-1/2" />
                <div className="space-y-3">
                    <SkeletonLoader className="h-12 w-full" />
                    <SkeletonLoader className="h-12 w-full" />
                    <SkeletonLoader className="h-12 w-full" />
                </div>
            </div>
            
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
              <SkeletonLoader className="h-5 w-1/3 mb-4" />
              <div className="space-y-4">
                  <div className="flex items-start gap-4">
                      <SkeletonLoader className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                          <SkeletonLoader className="h-4 w-1/4" />
                          <SkeletonLoader className="h-3 w-full" />
                      </div>
                  </div>
                  <div className="flex items-start gap-4">
                      <SkeletonLoader className="w-8 h-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                          <SkeletonLoader className="h-4 w-1/4" />
                          <SkeletonLoader className="h-3 w-full" />
                      </div>
                  </div>
              </div>
            </div>

            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                <SkeletonLoader className="h-5 w-1/3" />
                <div className="flex flex-wrap gap-2">
                    <SkeletonLoader className="h-6 w-24 rounded-full" />
                    <SkeletonLoader className="h-6 w-32 rounded-full" />
                    <SkeletonLoader className="h-6 w-20 rounded-full" />
                    <SkeletonLoader className="h-6 w-28 rounded-full" />
                </div>
            </div>
        </div>
      );
    }

    if (generationStep === 'error' && error) {
      return <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">{error}</div>;
    }

    if (!content) {
      return <div className="text-center text-gray-500">O conteúdo gerado aparecerá aqui.</div>;
    }

    return (
      <>
      <div className="space-y-8">
        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Informações Básicas</h3>
            <div className="space-y-4">
                <EditableField label="Nome do Produto" value={content.name} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <EditableField label="Categoria Sugerida" value={content.category} />
                    <EditableField label="Marca" value={content.brand || ''} />
                    <EditableField label="SKU Sugerido" value={content.sku || ''} />
                </div>
            </div>
        </div>
        
        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-300 mb-4">Descrição Persuasiva</h3>
          <EditableField label="" value={content.description} isTextarea />
        </div>

        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Preço, Estoque e Variações</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <EditableField label="Preço Competitivo (R$)" value={String(content.price || '')} type="number"/>
                <EditableField label="Preço Promocional (R$)" value={String(content.promocionalPrice || '')} type="number"/>
            </div>
            
            <label className="block text-sm font-medium text-gray-400 mb-2">Variações do Produto</label>
            <div className="space-y-4 sm:space-y-0">
                {/* Headers for larger screens */}
                <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium px-2 pb-2 border-b border-gray-700">
                    <span className="col-span-4">Cor</span>
                    <span className="col-span-3">Tamanho</span>
                    <span className="col-span-2">Estoque</span>
                    <span className="col-span-2">Preço (R$)</span>
                    <span className="col-span-1"></span>
                </div>
                {/* Variations list */}
                <div className="space-y-3 mt-2">
                {variations.map((variation, index) => (
                    // Mobile Card Layout
                    <div key={index} className="sm:hidden p-3 bg-gray-900 rounded-lg border border-gray-700">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400">Cor</label>
                                <input type="text" placeholder="Ex: Preto" value={variation.color || ''} onChange={(e) => handleVariationChange(index, 'color', e.target.value)} className="w-full mt-1 p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                            </div>
                             <div>
                                <label className="text-xs text-gray-400">Tamanho</label>
                                <input type="text" placeholder="Ex: G" value={variation.size || ''} onChange={(e) => handleVariationChange(index, 'size', e.target.value)} className="w-full mt-1 p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Estoque</label>
                                <input type="number" placeholder="0" value={variation.stock ?? ''} onChange={(e) => handleVariationChange(index, 'stock', e.target.value)} className="w-full mt-1 p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Preço (R$)</label>
                                <input type="number" step="0.01" placeholder="0.00" value={variation.price ?? ''} onChange={(e) => handleVariationChange(index, 'price', e.target.value)} className="w-full mt-1 p-2 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                            </div>
                        </div>
                        <button onClick={() => removeVariation(index)} className="w-full mt-3 text-center text-xs text-red-400 hover:text-red-300 transition flex items-center justify-center gap-1">
                            <TrashIcon className="w-3 h-3" /> Remover
                        </button>
                    </div>
                ))}
                {variations.map((variation, index) => (
                    // Desktop Table-Row Layout
                    <div key={index} className="hidden sm:grid grid-cols-12 gap-2 items-center">
                        <input type="text" placeholder="Ex: Preto" value={variation.color || ''} onChange={(e) => handleVariationChange(index, 'color', e.target.value)} className="col-span-4 w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                        <input type="text" placeholder="Ex: G" value={variation.size || ''} onChange={(e) => handleVariationChange(index, 'size', e.target.value)} className="col-span-3 w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                        <input type="number" placeholder="0" value={variation.stock ?? ''} onChange={(e) => handleVariationChange(index, 'stock', e.target.value)} className="col-span-2 w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                        <input type="number" step="0.01" placeholder="0.00" value={variation.price ?? ''} onChange={(e) => handleVariationChange(index, 'price', e.target.value)} className="col-span-2 w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                        <button onClick={() => removeVariation(index)} className="col-span-1 flex justify-center items-center text-gray-500 hover:text-red-400 transition">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                </div>
            </div>
            <button onClick={addVariation} className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition">
              + Adicionar Variação
            </button>
        </div>

        {content.coupon && (
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Cupom de Desconto Sugerido</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="space-y-4">
                        <EditableField label="Código do Cupom" value={content.coupon.code} />
                        <EditableField label="Frase Promocional" value={content.coupon.phrase} />
                    </div>
                    <div className="w-full">
                         <ImageResult
                            title="Banner Promocional (IA)"
                            imageSrc={generatedCouponBanner}
                            isLoading={areImagesLoading && !generatedCouponBanner}
                            onImageClick={(src) => setEditorConfig({isOpen: true, image: src})}
                            aspectRatio="aspect-video"
                         />
                    </div>
                </div>
            </div>
        )}

        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Logística</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditableField label="Peso (kg)" value={String(content.weight || '')} type="number" />
                <EditableField label="Dimensões da Embalagem (cm)" value={content.dimensions || ''} />
            </div>
        </div>

        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Otimização para SEO (IA)</h3>
            <div className="space-y-4">
                <EditableField label="Meta Title (para Google)" value={content.metaTitle || ''} />
                <EditableField label="Meta Description (para Google)" value={content.metaDescription || ''} isTextarea />
                <EditableField label="URL Amigável (Slug)" value={content.slug || ''} />
                <EditableField label="Texto Alternativo (Alt) para Imagem" value={content.imageAltText || ''} />
            </div>
        </div>
        
        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Imagem de Marketing (IA)</h3>
            <p className="text-sm text-gray-400 -mt-3">Uma nova imagem do seu produto, gerada pela IA, sem texto e otimizada para marketing.</p>
        
            <div className="max-w-md mx-auto">
                {(areImagesLoading || generatedImage) ? (
                    <ImageResult 
                        title="Imagem Gerada por IA" 
                        imageSrc={generatedImage} 
                        isLoading={areImagesLoading && !generatedImage} 
                        onImageClick={(src) => setEditorConfig({isOpen: true, image: src})} 
                    />
                ) : (
                    <div className="aspect-square w-full bg-gray-800 rounded-md flex items-center justify-center text-center text-sm text-gray-500 p-4">
                        A imagem gerada aparecerá aqui.
                    </div>
                )}
            </div>
        </div>

        {(areImagesLoading || generatedMockups.length > 0) && (
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                <h3 className="text-lg font-semibold text-gray-300">Mockups de Produto (IA)</h3>
                <p className="text-sm text-gray-400 -mt-3">Veja seu produto aplicado em diferentes cenários de marketing.</p>
                <div className="grid grid-cols-2 gap-4">
                    {areImagesLoading && generatedMockups.length === 0 ? (
                        <>
                            <SkeletonLoader className="aspect-square w-full" />
                            <SkeletonLoader className="aspect-square w-full" />
                            <SkeletonLoader className="aspect-square w-full" />
                            <SkeletonLoader className="aspect-square w-full" />
                        </>
                    ) : (
                        generatedMockups.map((mockupSrc, index) => (
                            <ImageResult 
                                key={index}
                                title={`Mockup ${index + 1}`} 
                                imageSrc={mockupSrc} 
                                isLoading={false} 
                                onImageClick={(src) => setEditorConfig({isOpen: true, image: src})} 
                            />
                        ))
                    )}
                </div>
            </div>
        )}

        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-300 mb-4">Sugestões de Texto para Imagem</h3>
          {content.imageTextSuggestions && content.imageTextSuggestions.length > 0 ? (
            <ul className="space-y-3">
              {content.imageTextSuggestions.map((suggestion, index) => (
                <SuggestionItem key={index} text={suggestion} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Nenhuma sugestão de texto foi gerada.</p>
          )}
        </div>
        
        {content.imageTextPlacementSuggestions && (
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-4">Dicas de Montagem para Imagem</h3>
                <PlacementSuggestions suggestions={content.imageTextPlacementSuggestions} />
            </div>
        )}

        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-300 mb-4">Conteúdo para Redes Sociais (IA)</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-200 mb-2">Legenda para Post (Instagram/Facebook)</h4>
              <EditableField label="" value={content.socialMediaPost || ''} isTextarea />
            </div>
            {content.videoScript && content.videoScript.scenes.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-200 mb-2">Roteiro para Vídeo Curto (Reels/TikTok)</h4>
                <div className="p-3 bg-gray-900 border border-gray-700 rounded-lg space-y-4">
                  <h5 className="font-bold text-center text-indigo-300">{content.videoScript.title}</h5>
                  {content.videoScript.scenes.map((scene, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-600/50 rounded-full flex items-center justify-center text-white font-bold text-sm border border-indigo-500">
                        {index + 1}
                      </div>
                      <div>
                        <h6 className="font-semibold text-gray-200">{scene.scene}</h6>
                        <p className="text-gray-400 text-sm">{scene.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-300 mb-4">Palavras-chave</h3>
          <div className="flex flex-wrap gap-2">
            {content.keywords.map((tag, index) => (
              <span key={index} className="px-3 py-1 bg-indigo-600/50 text-indigo-200 text-sm font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {content.hashtags && content.hashtags.length > 0 && (
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Hashtags para Redes Sociais</h3>
            <div className="flex flex-wrap gap-2">
              {content.hashtags.map((tag, index) => (
                <span key={index} className="px-3 py-1 bg-cyan-600/50 text-cyan-200 text-sm font-medium rounded-full">
                  #{tag.replace(/#/g, '')}
                </span>
              ))}
            </div>
          </div>
        )}

        <button className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-300">
          Publicar na Shopee (Simulado)
        </button>
      </div>
       {editorConfig.isOpen && editorConfig.image && (
        <ImageEditor 
          imageSrc={editorConfig.image}
          onClose={() => setEditorConfig({isOpen: false, image: null})}
          slogan={content.promotionalSlogan}
        />
      )}
      </>
    );
  };

  return (
    <div className="w-full lg:w-1/2 p-4 sm:p-6 bg-gray-800/50 rounded-2xl border border-gray-700 backdrop-blur-sm">
      <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-100">2. Revise o Conteúdo Gerado</h2>
      {renderContent()}
    </div>
  );
};

export default ProductOutput;