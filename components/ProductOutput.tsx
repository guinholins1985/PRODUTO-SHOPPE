import React, { useState, useEffect } from 'react';
import { ProductContent, ProductVariation, GeneratedProductImage } from '../types';
import CopyIcon from './icons/CopyIcon';
import CheckIcon from './icons/CheckIcon';
import TrashIcon from './icons/TrashIcon';
import { GenerationStep } from '../App';
import ImageEditor from './ImageEditor';
import ImageIcon from './icons/ImageIcon';
import LinkIcon from './icons/LinkIcon';

// Tab Icons
import GridIcon from './icons/GridIcon';
import MegaphoneIcon from './icons/MegaphoneIcon';
import TagIcon from './icons/TagIcon';
import CubeIcon from './icons/CubeIcon';

// New Icons for Info Cards
import SparklesIcon from './icons/SparklesIcon';


interface ProductOutputProps {
  content: ProductContent | null;
  generationStep: GenerationStep;
  error: string | null;
  generatedImage: GeneratedProductImage;
  generatedMockups: string[];
}

type TabName = 'overview' | 'images' | 'marketing' | 'seo' | 'data';

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

const InfoCard: React.FC<{
  title: string;
  copyText?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, copyText, children, className = '' }) => {
  const { copied, copy } = useCopyToClipboard(copyText || '');
  return (
    <div className={`relative bg-gray-900/50 p-4 rounded-lg border border-gray-700 hover:border-indigo-500 transition-all duration-300 group ${className}`}>
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">{title}</h3>
            {copyText && (
                <button onClick={copy} className="p-1 text-gray-400 hover:text-white transition opacity-50 group-hover:opacity-100">
                    {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                </button>
            )}
        </div>
        <div>{children}</div>
    </div>
  );
};


const EditableField: React.FC<{ label: string; value: string; isTextarea?: boolean, type?: string, onValueChange: (newValue: string) => void }> = ({ label, value, isTextarea = false, type = 'text', onValueChange }) => {
  const { copied, copy } = useCopyToClipboard(value);

  const InputComponent = isTextarea ? 'textarea' : 'input';
  const hasLabel = label && label.length > 0;

  return (
    <div className="relative w-full">
      {hasLabel && <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>}
      <InputComponent
        type={type}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onValueChange(e.target.value)}
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
  onEditClick: (src: string) => void;
  aspectRatio?: string;
}> = ({ title, imageSrc, isLoading, onEditClick, aspectRatio = 'aspect-square' }) => {
  const photopeaUrl = imageSrc
    ? `https://www.photopea.com#${encodeURIComponent(JSON.stringify({ files: [imageSrc] }))}`
    : '#';

  return (
    <div className="text-center group relative">
      {imageSrc ? (
        <>
          <img
            src={imageSrc}
            alt={title}
            className={`${aspectRatio} w-full object-cover rounded-md mb-2 border-2 border-transparent transition-all`}
          />
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-2">
            <button
              onClick={() => onEditClick(imageSrc)}
              className="flex items-center justify-center gap-2 px-4 py-2 mb-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition w-full max-w-[200px]"
            >
              <ImageIcon className="w-4 h-4" />
              Editor Rápido
            </button>
            <a
              href={photopeaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white text-sm font-semibold rounded-lg hover:bg-gray-600 transition w-full max-w-[200px]"
            >
              <LinkIcon className="w-4 h-4" />
              Editor Avançado
            </a>
          </div>
        </>
      ) : (
        <div className={`${aspectRatio} w-full bg-gray-800 rounded-md flex items-center justify-center text-center text-xs text-gray-500 p-2`}>
          {isLoading ? 'Gerando...' : 'Falha na Geração'}
        </div>
      )}
      <h4 className="text-sm font-semibold text-gray-400 mt-1">{title}</h4>
    </div>
  );
};


const ProductOutput: React.FC<ProductOutputProps> = ({ content: initialContent, generationStep, error, generatedImage, generatedMockups }) => {
  const [content, setContent] = useState<ProductContent | null>(initialContent);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [editorConfig, setEditorConfig] = useState<{isOpen: boolean; image: string | null; defaultText?: string}>({isOpen: false, image: null});
  const [activeTab, setActiveTab] = useState<TabName>('overview');
  
  useEffect(() => {
    setContent(initialContent);
    setVariations(initialContent?.variations || []);
  }, [initialContent]);

  const handleContentChange = (field: keyof ProductContent, value: any) => {
    if (content) {
      setContent({ ...content, [field]: value });
    }
  };

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
  
  const TABS: { id: TabName; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { id: 'overview', label: 'Visão Geral', icon: GridIcon },
    { id: 'images', label: 'Imagens', icon: ImageIcon },
    { id: 'marketing', label: 'Marketing', icon: MegaphoneIcon },
    { id: 'seo', label: 'SEO', icon: TagIcon },
    { id: 'data', label: 'Dados', icon: CubeIcon },
  ];

  const TabButton: React.FC<{ tab: typeof TABS[0] }> = ({ tab }) => (
    <button
      onClick={() => setActiveTab(tab.id)}
      className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
        activeTab === tab.id
          ? 'bg-indigo-600 text-white'
          : 'text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <tab.icon className="w-5 h-5" />
      <span className="hidden sm:inline">{tab.label}</span>
    </button>
  );

  const renderContent = () => {
    const isLoading = generationStep === 'content' || generationStep === 'images';
    const areImagesLoading = generationStep === 'images';

    if (isLoading && !content) {
      return (
        <div className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <SkeletonLoader className="h-24 w-full" />
                 <SkeletonLoader className="h-24 w-full" />
            </div>
            <SkeletonLoader className="h-40 w-full" />
            <SkeletonLoader className="h-32 w-full" />
        </div>
      );
    }

    if (generationStep === 'error' && error) {
      return <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg mt-6">{error}</div>;
    }

    if (!content) {
      return <div className="text-center text-gray-500 mt-6">O conteúdo gerado aparecerá aqui.</div>;
    }
    
    // Helper to format currency
    const formatCurrency = (value: number | undefined) => {
        if (value === undefined || value === null) return 'N/A';
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    }

    return (
      <div className="mt-6 space-y-8">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
             <InfoCard title="Nome do Produto" copyText={content.name}>
                <EditableField label="" value={content.name} onValueChange={(v) => handleContentChange('name', v)} />
            </InfoCard>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <InfoCard title="Preço Competitivo (R$)" copyText={String(content.price || '')}>
                     <EditableField label="" value={String(content.price || '')} type="number" onValueChange={(v) => handleContentChange('price', parseFloat(v))} />
                </InfoCard>
                {/* FIX: Corrected typo from 'promocionalPrice' to 'promotionalPrice' to match the 'ProductContent' type. */}
                <InfoCard title="Preço Promocional (R$)" copyText={String(content.promotionalPrice || '')}>
                    <EditableField label="" value={String(content.promotionalPrice || '')} type="number" onValueChange={(v) => handleContentChange('promotionalPrice', parseFloat(v))}/>
                </InfoCard>
            </div>
             <InfoCard title="Descrição Persuasiva" copyText={content.description}>
                <EditableField label="" value={content.description} isTextarea onValueChange={(v) => handleContentChange('description', v)} />
            </InfoCard>
             <InfoCard title="Slogan Promocional" copyText={content.promotionalSlogan || ''}>
                <p className="text-lg italic text-indigo-300">"{content.promotionalSlogan}"</p>
            </InfoCard>
          </div>
        )}
        
        {activeTab === 'images' && (
            <div className="space-y-8 animate-fade-in">
                <InfoCard title="Imagem de Marketing (IA)">
                    <p className="text-sm text-gray-400 mb-4 -mt-2">Uma nova imagem do seu produto, gerada pela IA, sem texto e otimizada para marketing.</p>
                    <div className="max-w-md mx-auto">
                        {(areImagesLoading || generatedImage) ? (
                            <ImageResult 
                                title="Imagem Gerada por IA" 
                                imageSrc={generatedImage} 
                                isLoading={areImagesLoading && !generatedImage} 
                                onEditClick={(src) => setEditorConfig({isOpen: true, image: src, defaultText: ''})} 
                            />
                        ) : (
                            <div className="aspect-square w-full bg-gray-800 rounded-md flex items-center justify-center text-center text-sm text-gray-500 p-4">
                                A imagem gerada aparecerá aqui.
                            </div>
                        )}
                    </div>
                </InfoCard>

                {(areImagesLoading || generatedMockups.length > 0) && (
                    <InfoCard title="Mockups de Produto (IA)">
                        <p className="text-sm text-gray-400 mb-4 -mt-2">Veja seu produto aplicado em diferentes cenários de marketing.</p>
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
                                        onEditClick={(src) => setEditorConfig({isOpen: true, image: src, defaultText: ''})} 
                                    />
                                ))
                            )}
                        </div>
                    </InfoCard>
                )}

                 <InfoCard title="Sugestões de Texto para Imagem">
                    {content.imageTextSuggestions && content.imageTextSuggestions.length > 0 ? (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {content.imageTextSuggestions.map((suggestion, index) => {
                             const { copied, copy } = useCopyToClipboard(suggestion);
                            return(
                                <li key={index} className="relative flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg group">
                                    <span className="text-gray-300 text-sm pr-8">{suggestion}</span>
                                    <button onClick={copy} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition opacity-0 group-hover:opacity-100">
                                        {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                                    </button>
                                </li>
                            );
                        })}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">Nenhuma sugestão de texto foi gerada.</p>
                    )}
                </InfoCard>
            </div>
        )}
        
        {activeTab === 'marketing' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                 <div className="space-y-8 lg:col-span-2">
                    <InfoCard title="Post para Redes Sociais (Instagram/Facebook)" copyText={content.socialMediaPost}>
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                             <p className="text-gray-300 whitespace-pre-line">{content.socialMediaPost}</p>
                        </div>
                    </InfoCard>
                </div>
                
                 <InfoCard title="Roteiro para Vídeo (Reels/TikTok)">
                    {content.videoScript && content.videoScript.scenes.length > 0 ? (
                        <div className="space-y-4">
                            <h5 className="font-bold text-center text-indigo-300 text-lg">"{content.videoScript.title}"</h5>
                             {content.videoScript.scenes.map((scene, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
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
                    ) : <p className="text-sm text-gray-500">Nenhum roteiro foi gerado.</p>}
                 </InfoCard>

                 <div className="space-y-8">
                     <InfoCard title="Hashtags">
                        {content.hashtags && content.hashtags.length > 0 ? (
                             <div className="flex flex-wrap gap-2">
                              {content.hashtags.map((tag, index) => (
                                <span key={index} className="px-3 py-1 bg-cyan-600/50 text-cyan-200 text-sm font-medium rounded-full">
                                  #{tag.replace(/#/g, '')}
                                </span>
                              ))}
                            </div>
                        ) : <p className="text-sm text-gray-500">Nenhuma hashtag foi gerada.</p>}
                    </InfoCard>

                     <InfoCard title="Cupom de Desconto">
                        {content.coupon ? (
                            <div className="space-y-3">
                                <div className="text-center p-3 border-2 border-dashed border-green-500 rounded-lg">
                                    <span className="text-2xl font-bold tracking-widest text-green-400">{content.coupon.code}</span>
                                </div>
                                <p className="text-center text-gray-300 text-sm">{content.coupon.phrase}</p>
                            </div>
                        ) : <p className="text-sm text-gray-500">Nenhum cupom foi gerado.</p>}
                    </InfoCard>
                 </div>
            </div>
        )}
        
        {activeTab === 'seo' && (
            <div className="space-y-6 animate-fade-in">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoCard title="Meta Title" copyText={content.metaTitle}>
                        <p className="text-gray-300">{content.metaTitle}</p>
                    </InfoCard>
                     <InfoCard title="URL Amigável (Slug)" copyText={content.slug}>
                        <p className="text-gray-300 font-mono text-sm">{content.slug}</p>
                    </InfoCard>
                 </div>
                 <InfoCard title="Meta Description" copyText={content.metaDescription}>
                    <p className="text-gray-400">{content.metaDescription}</p>
                </InfoCard>
                <InfoCard title="Texto Alternativo (Alt)" copyText={content.imageAltText}>
                    <p className="text-gray-400">{content.imageAltText}</p>
                </InfoCard>
                 <InfoCard title="Palavras-chave">
                    <div className="flex flex-wrap gap-2">
                        {content.keywords.map((tag, index) => (
                        <span key={index} className="px-3 py-1 bg-indigo-600/50 text-indigo-200 text-sm font-medium rounded-full">
                            {tag}
                        </span>
                        ))}
                    </div>
                 </InfoCard>
            </div>
        )}

        {activeTab === 'data' && (
            <div className="space-y-6 animate-fade-in">
                 <InfoCard title="Dados do Produto">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <div className="space-y-1">
                            <p className="text-xs text-gray-400">Categoria</p>
                            <p className="text-gray-200">{content.category}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-gray-400">Marca</p>
                            <p className="text-gray-200">{content.brand || 'N/A'}</p>
                        </div>
                         <div className="space-y-1">
                            <p className="text-xs text-gray-400">SKU Sugerido</p>
                            <p className="text-gray-200">{content.sku || 'N/A'}</p>
                        </div>
                    </div>
                 </InfoCard>

                 <InfoCard title="Variações do Produto">
                    <div className="space-y-3">
                        {variations.map((variation, index) => (
                             <div key={index} className="grid grid-cols-10 gap-2 items-center p-2 bg-gray-800/70 rounded-md">
                                <input type="text" placeholder="Cor" value={variation.color || ''} onChange={(e) => handleVariationChange(index, 'color', e.target.value)} className="col-span-3 w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                                <input type="text" placeholder="Tamanho" value={variation.size || ''} onChange={(e) => handleVariationChange(index, 'size', e.target.value)} className="col-span-2 w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                                <input type="number" placeholder="Estoque" value={variation.stock ?? ''} onChange={(e) => handleVariationChange(index, 'stock', e.target.value)} className="col-span-2 w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                                <input type="number" step="0.01" placeholder="Preço" value={variation.price ?? ''} onChange={(e) => handleVariationChange(index, 'price', e.target.value)} className="col-span-2 w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition" />
                                <button onClick={() => removeVariation(index)} className="col-span-1 flex justify-center items-center text-gray-500 hover:text-red-400 transition">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                     <button onClick={addVariation} className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition">
                        + Adicionar Variação
                    </button>
                 </InfoCard>
                
                 <InfoCard title="Logística">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-xs text-gray-400">Peso (kg)</p>
                            <p className="text-gray-200">{content.weight || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-gray-400">Dimensões (cm)</p>
                            <p className="text-gray-200">{content.dimensions || 'N/A'}</p>
                        </div>
                    </div>
                </InfoCard>
            </div>
        )}
      </div>
       
    );
  };

  return (
    <section id="output-section" className="w-full max-w-4xl p-4 sm:p-6 bg-gray-800/50 rounded-2xl border border-gray-700 backdrop-blur-sm">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-100">2. Revise e Exporte o Conteúdo Gerado</h2>
      
      {content && !error && (
        <div className="border-b border-gray-700 mt-4">
          <nav className="flex space-x-2 overflow-x-auto pb-2 -mb-px" aria-label="Tabs">
            {TABS.map((tab) => <TabButton key={tab.id} tab={tab} />)}
          </nav>
        </div>
      )}

      {renderContent()}

      {editorConfig.isOpen && editorConfig.image && (
        <ImageEditor 
          imageSrc={editorConfig.image}
          onClose={() => setEditorConfig({isOpen: false, image: null})}
          slogan={editorConfig.defaultText}
        />
      )}
    </section>
  );
};

export default ProductOutput;