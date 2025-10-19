
import React, { useRef, useEffect, useState, useCallback } from 'react';
import TextIcon from './icons/TextIcon';
import UploadIcon from './icons/UploadIcon';
import DownloadIcon from './icons/DownloadIcon';

interface ImageEditorProps {
  imageSrc: string;
  onClose: () => void;
  slogan?: string;
}

interface TextObject {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
  isDragging: boolean;
  offsetX: number;
  offsetY: number;
}

interface LogoObject {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  isDragging: boolean;
  offsetX: number;
  offsetY: number;
}

const TEMPLATES = [
    { name: 'None', src: null },
    { name: 'Sale', src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iI0ZGMzU1NSIgZD0iTTUgNWg1MDJ2MTIwSDV6Ii8+PHRleHQgeD0iNTAlIiB5PSI4MCIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNzIiIGZvbnQtZmFtaWx5PSJJbXBhY3QsIHNhbnMtc2VyaWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIgcGFpbnQtb3JkZXI9InN0cm9rZSBmaWxsIj5MSVFV SURBw4fDg08hPC90ZXh0Pjwvc3ZnPg==' },
    { name: 'Frame', src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQ5MiIgaGVpZ2h0PSI0OTIiIHg9IjEwIiB5PSIxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyMCIvPjwvc3ZnPg==' },
    { name: 'Corner', src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZmlsbD0iIzRGNkFGRiIgZD0iTTUxMiA1MTJWMGwxNDQgMTQ0eiIvPjxjaXJjbGUgY3g9IjQ0MCIgY3k9IjcwIiByPSI0MCIgZmlsbD0iI0ZBN0MyRiIvPjwvc3ZnPg==' },
];

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onClose, slogan }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [texts, setTexts] = useState<TextObject[]>([]);
  const [logo, setLogo] = useState<LogoObject | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<HTMLImageElement | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<number | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const baseImage = new Image();
    baseImage.crossOrigin = 'anonymous';
    baseImage.src = imageSrc;
    baseImage.onload = () => {
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
      
      if (activeTemplate) {
        ctx.drawImage(activeTemplate, 0, 0, canvas.width, canvas.height);
      }

      texts.forEach(t => {
        ctx.font = `${t.size}px Arial`;
        ctx.fillStyle = t.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.text, t.x, t.y);
      });

      if (logo) {
        ctx.drawImage(logo.image, logo.x, logo.y, logo.width, logo.height);
      }
    };
  }, [imageSrc, texts, logo, activeTemplate]);

  useEffect(() => {
    draw();
  }, [draw]);

  const addText = () => {
    const newText: TextObject = {
      id: Date.now(),
      text: slogan || 'Seu Texto Aqui',
      x: (canvasRef.current?.width || 0) / 2,
      y: (canvasRef.current?.height || 0) / 2,
      color: '#FFFFFF',
      size: 40,
      isDragging: false,
      offsetX: 0,
      offsetY: 0,
    };
    setTexts(prev => [...prev, newText]);
    setSelectedTextId(newText.id);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          const canvasWidth = canvasRef.current?.width || 512;
          const newWidth = canvasWidth * 0.25; // 25% of canvas width
          setLogo({
            image: img,
            x: 20,
            y: 20,
            width: newWidth,
            height: newWidth / aspectRatio,
            isDragging: false,
            offsetX: 0,
            offsetY: 0,
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleTemplateChange = (templateSrc: string | null) => {
    if (!templateSrc) {
        setActiveTemplate(null);
        return;
    }
    const img = new Image();
    img.src = templateSrc;
    img.onload = () => {
        setActiveTemplate(img);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let foundText = false;
    setTexts(texts.map(t => {
        const textWidth = canvas.getContext('2d')!.measureText(t.text).width;
        if (x > t.x - textWidth / 2 && x < t.x + textWidth / 2 && y > t.y - t.size / 2 && y < t.y + t.size / 2) {
            setSelectedTextId(t.id);
            foundText = true;
            return { ...t, isDragging: true, offsetX: x - t.x, offsetY: y - t.y };
        }
        return t;
    }));

    if (!foundText && logo && x > logo.x && x < logo.x + logo.width && y > logo.y && y < logo.y + logo.height) {
        setLogo({ ...logo, isDragging: true, offsetX: x - logo.x, offsetY: y - logo.y });
        setSelectedTextId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setTexts(texts.map(t => t.isDragging ? { ...t, x: x - t.offsetX, y: y - t.offsetY } : t));
    if (logo?.isDragging) {
        setLogo({ ...logo, x: x - logo.offsetX, y: y - logo.offsetY });
    }
  };

  const handleMouseUp = () => {
    setTexts(texts.map(t => ({ ...t, isDragging: false })));
    if (logo) {
        setLogo({ ...logo, isDragging: false });
    }
  };
  
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
        const link = document.createElement('a');
        link.download = 'product-image.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
  };

  const updateSelectedText = (prop: keyof TextObject, value: any) => {
    setTexts(texts.map(t => t.id === selectedTextId ? { ...t, [prop]: value } : t));
  }

  const selectedText = texts.find(t => t.id === selectedTextId);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose} style={{ backdropFilter: 'blur(8px)' }}>
      <div className="bg-gray-800 rounded-lg shadow-2xl flex flex-col md:flex-row gap-4 p-4 max-w-6xl w-full max-h-[95vh]" onClick={e => e.stopPropagation()}>
        {/* Controls */}
        <div className="w-full md:w-80 bg-gray-900 p-4 rounded-lg space-y-4 overflow-y-auto">
            <h3 className="text-xl font-bold">Editor de Imagem</h3>
            
            <div className="space-y-2">
                <button onClick={addText} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"> <TextIcon className="w-4 h-4" /> Adicionar Texto</button>
                <button onClick={() => logoInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition"> <UploadIcon className="w-4 h-4" /> Adicionar Logo</button>
                <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Templates</label>
                <div className="grid grid-cols-2 gap-2">
                    {TEMPLATES.map(t => (
                        <button key={t.name} onClick={() => handleTemplateChange(t.src)} className="aspect-square bg-gray-700 rounded-md hover:ring-2 ring-indigo-500 transition flex items-center justify-center text-xs p-1">
                            {t.src ? <img src={t.src} alt={t.name} className="object-contain max-h-full" /> : <span>Nenhum</span>}
                        </button>
                    ))}
                </div>
            </div>

            {selectedText && (
                <div className="bg-gray-800 p-3 rounded-lg space-y-3">
                    <h4 className="font-semibold">Editar Texto</h4>
                    <input type="text" value={selectedText.text} onChange={e => updateSelectedText('text', e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <div className="flex items-center gap-2">
                        <label className="text-sm">Cor:</label>
                        <input type="color" value={selectedText.color} onChange={e => updateSelectedText('color', e.target.value)} className="w-8 h-8 p-0 border-none rounded bg-gray-700 cursor-pointer" />
                        <label className="text-sm">Tam:</label>
                        <input type="number" value={selectedText.size} onChange={e => updateSelectedText('size', Number(e.target.value))} className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <button onClick={() => { setTexts(texts.filter(t => t.id !== selectedTextId)); setSelectedTextId(null); }} className="w-full text-sm text-red-400 hover:text-red-300">Remover Texto</button>
                </div>
            )}
            
            <div className="!mt-auto pt-4 border-t border-gray-700">
                <button onClick={handleDownload} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition"> <DownloadIcon className="w-4 h-4" /> Baixar Imagem</button>
            </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-gray-900 rounded-lg p-2">
            <canvas
              ref={canvasRef}
              width={512}
              height={512}
              className="max-w-full max-h-full object-contain cursor-grab"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
        </div>
      </div>
       <button onClick={onClose} className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-300 transition-colors">&times;</button>
    </div>
  );
};

export default ImageEditor;
