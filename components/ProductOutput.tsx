import React, { useState, useEffect } from 'react';
import { ProductContent, ProductVariation, GeneratedImageSet } from '../types';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';
import TrashIcon from './icons/TrashIcon';
import { GenerationStep } from '../App';
import ImageEditor from './ImageEditor';

interface ProductOutputProps {
  content: ProductContent | null;
  generationStep: GenerationStep;
  error: string | null;
  originalImagePreview: string | null;
  generatedImages: GeneratedImageSet;
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
        className={`w-full p-3 pr-10 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition ${isTextarea ? 'min-h-[200px]' : ''}`}
        rows={isTextarea ? 8 : undefined}
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
}> = ({ title, imageSrc, isLoading, onImageClick }) => {
  return (
    <div className="text-center">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={title}
          className="aspect-square w-full object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity mb-2 border-2 border-transparent hover:border-indigo-500"
          onClick={() => onImageClick(imageSrc)}
        />
      ) : (
        <div className="aspect-square w-full bg-gray-800 rounded-md flex items-center justify-center text-center text-xs text-gray-500 p-2">
          {isLoading ? 'Gerando...' : 'Falha na Geração'}
        </div>
      )}
      <h4 className="text-sm font-semibold text-gray-400">{title}</h4>
    </div>
  );
};

const ProductOutput: React.FC<ProductOutputProps> = ({ content, generationStep, error, originalImagePreview, generatedImages }) => {
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
            <SkeletonLoader className="h-6 w-2/3 mb-2" />
            <SkeletonLoader className="h-10 w-full" />
            
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                <SkeletonLoader className="h-5 w-1/3" />
                <SkeletonLoader className="h-10 w-full" />
                <div className="grid grid-cols-3 gap-4">
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
                 <SkeletonLoader className="h-5 w-1/3 mb-3" />
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i}>
                            <SkeletonLoader className="aspect-square w-full mb-2" />
                            <SkeletonLoader className="h-4 w-3/4 mx-auto" />
                        </div>
                    ))}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <EditableField label="Preço Competitivo (R$)" value={String(content.price || '')} type="number"/>
                <EditableField label="Preço Promocional (R$)" value={String(content.promotionalPrice || '')} type="number"/>
            </div>
            
            <label className="block text-sm font-medium text-gray-400 mb-2">Variações do Produto</label>
            <div className="overflow-x-auto">
                <div className="min-w-full text-sm">
                    <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium px-2 pb-1 border-b border-gray-700">
                        <span className="col-span-4">Cor</span>
                        <span className="col-span-3">Tamanho</span>
                        <span className="col-span-2">Estoque</span>
                        <span className="col-span-2">Preço (R$)</span>
                        <span className="col-span-1"></span>
                    </div>
                    <div className="space-y-2 mt-2">
                    {variations.map((variation, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
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
            </div>
            <button onClick={addVariation} className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition">
              + Adicionar Variação
            </button>
        </div>

        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Logística</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EditableField label="Peso (kg)" value={String(content.weight || '')} type="number" />
                <EditableField label="Dimensões da Embalagem (cm)" value={content.dimensions || ''} />
            </div>
        </div>

        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Imagens de Marketing (IA)</h3>
            <p className="text-sm text-gray-400 -mt-3">Sua imagem original e 5 modelos otimizados pela IA.</p>
        
            {originalImagePreview ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Slot 1: Original */}
                    <div className="text-center">
                        <img 
                            src={originalImagePreview} 
                            alt="Produto Original" 
                            className="aspect-square w-full object-cover rounded-md mb-2 border-2 border-transparent"
                        />
                        <h4 className="text-sm font-semibold text-gray-400">Original</h4>
                    </div>
                    {/* The 5 Generated slots */}
                    <ImageResult title="Remasterizada" imageSrc={generatedImages.remastered} isLoading={areImagesLoading} onImageClick={(src) => setEditorConfig({isOpen: true, image: src})} />
                    <ImageResult title="Fundo de Estúdio" imageSrc={generatedImages.studio} isLoading={areImagesLoading} onImageClick={(src) => setEditorConfig({isOpen: true, image: src})} />
                    <ImageResult title="Anúncio com Texto" imageSrc={generatedImages.infographic} isLoading={areImagesLoading} onImageClick={(src) => setEditorConfig({isOpen: true, image: src})} />
                    <ImageResult title="Cenário Realista" imageSrc={generatedImages.lifestyle} isLoading={areImagesLoading} onImageClick={(src) => setEditorConfig({isOpen: true, image: src})} />
                    <ImageResult title="Iluminação Dramática" imageSrc={generatedImages.dramatic} isLoading={areImagesLoading} onImageClick={(src) => setEditorConfig({isOpen: true, image: src})} />
                </div>
            ) : (
                 <p className="text-sm text-gray-500 text-center py-4">Nenhuma imagem para exibir. Envie uma imagem para gerar as versões de marketing.</p>
            )}
        </div>
        
        <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-300 mb-4">SEO e Palavras-chave</h3>
          <div className="flex flex-wrap gap-2">
            {content.keywords.map((tag, index) => (
              <span key={index} className="px-3 py-1 bg-indigo-600/50 text-indigo-200 text-sm font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

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
    <div className="w-full lg:w-1/2 p-6 bg-gray-800/50 rounded-2xl border border-gray-700 backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-4 text-gray-100">2. Revise o Conteúdo Gerado</h2>
      {renderContent()}
    </div>
  );
};

export default ProductOutput;