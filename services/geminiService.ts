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
 * Generates an edited marketing image from a base image and a text prompt.
 * @param originalImage The original product image file.
 * @param prompt The editing instruction.
 * @returns A promise that resolves to a base64 encoded image string or null if generation fails.
 */
const editImage = async (originalImage: File, prompt: string): Promise<string | null> => {
    try {
        const imagePart = await fileToGenerativePart(originalImage);
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: [{ parts: [imagePart, textPart] }],
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        // Robustly parse the response to find the image data
        const imageResponsePart = response.candidates?.[0]?.content?.parts?.find(
            (part) => part.inlineData?.mimeType.startsWith('image/')
        );

        if (imageResponsePart && imageResponsePart.inlineData) {
            const base64ImageBytes = imageResponsePart.inlineData.data;
            const mimeType = imageResponsePart.inlineData.mimeType;
            return `data:${mimeType};base64,${base64ImageBytes}`;
        } else {
            console.error("Image generation failed: No image data found in response.", { prompt });
            return null;
        }

    } catch (error) {
        console.error(`Image editing failed for prompt: "${prompt}"`, error);
        return null;
    }
};


/**
 * Generates a set of edited marketing images for a product.
 * @param image The original product image file.
 * @param content The product content, used for context in prompts.
 * @returns A promise that resolves to a GeneratedImageSet.
 */
export const generateProductImages = async (image: File, content: ProductContent): Promise<GeneratedImageSet> => {
    const slogan = content.promotionalSlogan || content.name;

    const creativeTextAdPrompts = [
      `Adicione o slogan "${slogan}" a esta imagem de forma criativa e magnética. Use uma tipografia premium que combine com o produto. A composição deve ser limpa e profissional, como um anúncio de revista.`,
    ];

    const optimized4KPrompts = [
        `Otimize esta imagem para qualidade 4K. Remova o fundo e substitua por um fundo de estúdio profissional com iluminação suave. Aumente a nitidez e os detalhes do produto para um visual ultra-realista e de alta resolução.`,
    ];
    
    const creativeTextAdPromises = creativeTextAdPrompts.map(p => editImage(image, p));
    const optimized4KPromises = optimized4KPrompts.map(p => editImage(image, p));

    const [creativeTextAd, optimized4K] = await Promise.all([
        Promise.all(creativeTextAdPromises),
        Promise.all(optimized4KPromises),
    ]);
    
    return { 
        creativeTextAd, 
        optimized4K,
    };
};