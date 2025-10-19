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
 * Generates a set of marketing images for a product by editing the original image.
 * @param content The product content, used for context.
 * @param originalImage The original product image file to be edited.
 * @returns A promise that resolves to a GeneratedImageSet.
 */
export const generateProductImages = async (content: ProductContent, originalImage: File): Promise<GeneratedImageSet> => {
    
    // Helper function to generate a single edited image and return its base64 string.
    const generateSingleImage = async (prompt: string, imageFile: File): Promise<string | null> => {
        try {
            const imagePart = await fileToGenerativePart(imageFile);
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image', // Model specialized in image editing
                contents: {
                    parts: [
                        imagePart,
                        { text: prompt },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE], // Expecting an image response
                },
            });
            
            // Extract the image data from the response
            const firstPart = response.candidates?.[0]?.content?.parts?.[0];
            if (firstPart && firstPart.inlineData) {
                const base64ImageBytes: string = firstPart.inlineData.data;
                const mimeType = firstPart.inlineData.mimeType;
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }
            console.warn("Image generation returned no image data for prompt:", prompt);
            return null;

        } catch (error) {
            console.error(`Image editing failed for prompt: "${prompt}"`, error);
            return null;
        }
    };

    const slogan = content.promotionalSlogan || 'Oferta Especial';

    const withTextPrompts = [
        `Edite esta imagem para criar um anúncio de marketing. Adicione o slogan '${slogan}' de forma elegante, com tipografia profissional e de alta classe.`,
        `Transforme esta imagem em um banner promocional. O texto '${slogan}' deve ser o foco, com grande impacto visual. Mantenha o produto como estrela principal.`,
        `Crie um post para redes sociais a partir desta foto. Integre o texto '${slogan}' de forma criativa na composição. Estilo moderno e limpo.`,
        `Ajuste esta imagem para ser a capa de um site. Posicione o slogan '${slogan}' em uma área que não cubra detalhes importantes do produto.`,
        `Gere um gráfico para e-mail marketing a partir desta imagem. O texto '${slogan}' deve funcionar como uma chamada para ação (call-to-action).`,
    ];

    const cleanPrompts = [
        `Edite esta imagem: isole o produto principal e coloque-o em um fundo branco infinito, limpo, de estúdio. A iluminação deve ser perfeita, como em um e-commerce profissional. Remova qualquer distração.`,
        `Refine esta imagem para um catálogo. Isole o produto e coloque-o em um fundo cinza claro e neutro. Adicione uma sombra suave e realista para dar profundidade.`,
        `Otimize esta foto para marketplaces: recorte o produto e coloque-o em um fundo totalmente branco (#FFFFFF), sem sombras ou reflexos.`,
        `Faça um close-up do produto nesta imagem, mantendo o fundo branco. O objetivo é mostrar a qualidade do material e a textura em detalhes.`,
        `Limpe o fundo desta imagem, deixando-o completamente branco. Ajuste o brilho e contraste do produto para que ele se destaque.`,
    ];

    const modernPrompts = [
        `Recrie esta cena com um estilo moderno. Coloque o produto sobre uma superfície de mármore ou concreto, com um fundo de gradiente suave. Conceito de luxo.`,
        `Edite esta imagem para que o produto pareça estar levitando sobre um fundo de cor sólida e vibrante. Adicione uma sombra sutil abaixo dele para realismo.`,
        `Dê um toque de design a esta foto. Adicione elementos gráficos geométricos (círculos, linhas) que complementem o formato do produto.`,
        `Crie uma composição artística com o produto. Use reflexos na superfície e sombras longas e dramáticas para um clima elegante e sofisticado.`,
        `Altere o ambiente desta foto para um cenário minimalista de estilo de vida, que tenha relação com o uso do produto. Use iluminação natural e desfoque o fundo.`,
    ];
    
    // Pass the original image to each generation call
    const withTextPromises = withTextPrompts.map(p => generateSingleImage(p, originalImage));
    const cleanPromises = cleanPrompts.map(p => generateSingleImage(p, originalImage));
    const modernPromises = modernPrompts.map(p => generateSingleImage(p, originalImage));

    const [withText, clean, modern] = await Promise.all([
        Promise.all(withTextPromises),
        Promise.all(cleanPromises),
        Promise.all(modernPromises),
    ]);
    
    return { 
        withText: withText.filter((img): img is string => !!img), 
        clean: clean.filter((img): img is string => !!img), 
        modern: modern.filter((img): img is string => !!img) 
    };
};