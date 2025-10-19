import { GoogleGenAI, Type, Modality } from '@google/genai';
import { ProductContent, GeneratedImageSet } from '../types';

// Assuming API_KEY is set in the environment, which is a requirement from the instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Converts a File object to a GoogleGenAI.Part object.
 * @param file The file to convert.
 * @returns A promise that resolves to a Part object.
 */
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

// Schema for the product content generation, aligned with the ProductContent type.
const productContentSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: 'Nome do produto, criativo e otimizado para SEO, com até 120 caracteres.' },
        description: { type: Type.STRING, description: 'Descrição de marketing persuasiva e detalhada do produto, com pelo menos 3 parágrafos, usando técnicas de copywriting.' },
        category: { type: Type.STRING, description: 'Sugestão de categoria para o produto em um e-commerce.' },
        brand: { type: Type.STRING, description: 'Marca do produto, se identificável.' },
        sku: { type: Type.STRING, description: 'Sugestão de um código SKU (Stock Keeping Unit) para o produto.' },
        price: { type: Type.NUMBER, description: 'Preço de venda sugerido, competitivo para o mercado.' },
        promotionalPrice: { type: Type.NUMBER, description: 'Preço promocional sugerido, se aplicável.' },
        keywords: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: 'Lista de 10 a 15 palavras-chave relevantes para SEO.'
        },
        variations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    color: { type: Type.STRING, description: 'Cor da variação do produto.' },
                    size: { type: Type.STRING, description: 'Tamanho da variação do produto (ex: P, M, G, 38, 40).' },
                    stock: { type: Type.INTEGER, description: 'Sugestão de estoque inicial para a variação.' },
                    price: { type: Type.NUMBER, description: 'Preço específico para esta variação, se diferente do principal.' },
                },
                required: [], // Making variations fields optional
            },
            description: 'Lista de variações do produto (cor, tamanho, etc.), se aplicável. Pode ser um array vazio.'
        },
        weight: { type: Type.NUMBER, description: 'Peso estimado do produto embalado em quilogramas (kg).' },
        dimensions: { type: Type.STRING, description: 'Dimensões estimadas da embalagem no formato "C x L x A cm".' },
        promotionalSlogan: { type: Type.STRING, description: 'Um slogan curto e impactante para usar em imagens promocionais, com no máximo 5 palavras.'}
    },
    required: ['name', 'description', 'category', 'price', 'keywords', 'variations', 'promotionalSlogan'],
};

/**
 * Generates product content (details, description, etc.) using Gemini.
 * Implements a fallback mechanism, trying a list of models if one fails.
 * @param image Optional product image file.
 * @param title Keywords or title for the product.
 * @param url Optional URL of the product.
 * @returns A promise that resolves to the generated ProductContent.
 */
export const generateProductContent = async (image: File | null, title: string, url:string): Promise<ProductContent> => {
    const modelsToTry = ['gemini-2.5-pro', 'gemini-2.5-flash'];
    let lastError: Error | null = null;

    const parts: any[] = [];
    
    let promptText = `Você é um especialista em marketing e e-commerce. Sua tarefa é criar um cadastro de produto completo e otimizado para a venda online, seguindo estritamente o schema JSON fornecido.

**Instruções:**
1. Analise a imagem (se fornecida), o link (se fornecido) e as palavras-chave para entender o produto.
2. Gere todos os campos do schema JSON com informações precisas, criativas e persuasivas.
3. Se a imagem não for clara, use as palavras-chave e o link como guia principal.
4. Crie uma descrição de marketing vibrante, destacando os benefícios e características do produto.
5. Sugira um preço competitivo e variações relevantes, se aplicável ao produto. Se não houver variações claras, retorne um array vazio.
6. Gere um slogan promocional curto e impactante para ser usado em imagens.

**Detalhes do Produto:**
- Palavras-chave/Título fornecido: "${title || 'Não fornecido'}"`;

    if (url) {
        promptText += `\n- Link do produto: ${url}`;
    }

    if (image) {
        const imagePart = await fileToGenerativePart(image);
        parts.push(imagePart);
    }
    
    parts.push({ text: promptText });

    for (const model of modelsToTry) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: [{ parts }],
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: productContentSchema,
                }
            });

            const jsonText = response.text.trim();
            const productData = JSON.parse(jsonText);
            // If parsing succeeds, we have our content. Return it.
            return productData as ProductContent;

        } catch (e) {
            console.error(`Model ${model} failed for content generation.`, e);
            lastError = e instanceof Error ? e : new Error(String(e));
        }
    }

    // If the loop completes without returning, all models have failed.
    throw new Error(`A geração de conteúdo falhou após tentar ${modelsToTry.length} modelos. Por favor, tente novamente. (Erro: ${lastError?.message})`);
};


/**
 * Generates a set of marketing images for a product using Gemini.
 * @param content The product content, used for context.
 * @param image The base product image file.
 * @returns A promise that resolves to a GeneratedImageSet.
 */
export const generateProductImages = async (content: ProductContent, image: File | null): Promise<GeneratedImageSet> => {
    if (!image) {
        return { withText: [], clean: [], modern: [] };
    }

    const imagePart = await fileToGenerativePart(image);

    const generateImage = async (prompt: string): Promise<string | null> => {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        imagePart,
                        { text: prompt }
                    ]
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                }
            });
            
            for (const part of response.candidates![0].content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
            return null;
        } catch (error) {
            console.error(`Image generation failed for prompt: "${prompt}"`, error);
            return null;
        }
    };

    const slogan = content.promotionalSlogan || 'Oferta Especial';

    const withTextPrompts = [
        `Adicione o texto "${slogan}" de forma elegante e legível na imagem. Use uma fonte comercial atraente que se destaque.`,
        `Incorpore a frase "${slogan}" com um design de texto moderno que chame a atenção, talvez em um canto da imagem.`,
        `Coloque o slogan "${slogan}" em um banner ou faixa sutil sobre a imagem, sem cobrir o produto.`,
        `Crie uma versão com o texto "${slogan}" em uma tipografia minimalista e sofisticada.`,
        `Adicione o texto "${slogan}" com um efeito de sombra ou contorno para melhorar a legibilidade.`,
    ];

    const cleanPrompts = [
        'Remova o fundo da imagem, deixando apenas o produto com um fundo branco profissional de estúdio.',
        'Melhore a iluminação e as cores da imagem para torná-la mais vibrante e profissional, mantendo o fundo original.',
        'Coloque o produto em um fundo de cor sólida e neutra (cinza claro) que complemente suas cores.',
        'Crie uma sombra suave e realista para o produto, como se estivesse em uma superfície limpa.',
        'Ajuste o foco para destacar perfeitamente o produto, desfocando levemente o fundo existente.',
    ];

    const modernPrompts = [
        'Adicione um fundo gradiente com cores modernas e suaves que combinem com o produto.',
        'Crie um efeito de reflexo do produto em uma superfície espelhada ou de água abaixo dele.',
        'Coloque o produto em um cenário de estilo de vida minimalista que se relacione com seu uso.',
        'Adicione elementos gráficos geométricos e minimalistas (linhas, círculos) ao redor do produto para um visual moderno.',
        'Crie uma composição artística com o produto em destaque sobre um fundo de textura abstrata (mármore, cimento, etc).',
    ];
    
    const withTextPromises = withTextPrompts.map(p => generateImage(p));
    const cleanPromises = cleanPrompts.map(p => generateImage(p));
    const modernPromises = modernPrompts.map(p => generateImage(p));

    const [withText, clean, modern] = await Promise.all([
        Promise.all(withTextPromises),
        Promise.all(cleanPromises),
        Promise.all(modernPromises),
    ]);
    
    return { 
        withText: withText.map(img => img || ''), 
        clean: clean.map(img => img || ''), 
        modern: modern.map(img => img || '') 
    };
};