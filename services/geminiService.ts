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
 * Generates a set of marketing images for a product using a text-to-image model.
 * @param content The product content, used for context.
 * @returns A promise that resolves to a GeneratedImageSet.
 */
export const generateProductImages = async (content: ProductContent): Promise<GeneratedImageSet> => {
    
    // Helper function to generate a single image and return its base64 string.
    const generateSingleImage = async (prompt: string): Promise<string | null> => {
        try {
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: prompt,
                config: {
                  numberOfImages: 1,
                  outputMimeType: 'image/jpeg',
                },
            });

            const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
            if (base64ImageBytes) {
                return `data:image/jpeg;base64,${base64ImageBytes}`;
            }
            return null;
        } catch (error) {
            console.error(`Image generation failed for prompt: "${prompt}"`, error);
            return null;
        }
    };

    const slogan = content.promotionalSlogan || 'Oferta Especial';
    const productName = content.name;

    const withTextPrompts = [
        `Anúncio de marketing atraente para '${productName}'. A imagem deve ter um visual premium com o slogan '${slogan}' integrado elegantemente com tipografia sofisticada. Foco no apelo visual do produto.`,
        `Banner promocional para e-commerce mostrando '${productName}'. O texto '${slogan}' deve ser claro e impactante. Composição dinâmica e cores vibrantes.`,
        `Post para redes sociais para o produto '${productName}'. Incluir o texto '${slogan}' de forma criativa. Estilo moderno, limpo e profissional.`,
        `Imagem de herói para um site, destacando '${productName}'. O slogan '${slogan}' deve ser posicionado de forma a não cobrir o produto. Iluminação dramática.`,
        `Gráfico para e-mail marketing de '${productName}'. O texto '${slogan}' deve ser o call-to-action principal. Fundo que complementa o produto.`,
    ];

    const cleanPrompts = [
        `Fotografia de produto profissional de e-commerce de '${productName}', em um fundo branco infinito e limpo. Iluminação de estúdio perfeita, destacando as texturas e detalhes. Alta resolução, fotorrealista.`,
        `Imagem de catálogo para '${productName}'. Fundo cinza claro e neutro. Sombra suave e realista. Foco total no produto.`,
        `Foto de '${productName}' isolado em um fundo branco puro. Sem distrações. Perfeito para marketplaces.`,
        `Close-up detalhado de '${productName}' em um fundo branco. A imagem deve mostrar a qualidade do material e a construção.`,
        `Composição minimalista com '${productName}' em um fundo branco. Ângulo de 45 graus.`,
    ];

    const modernPrompts = [
        `Uma foto de estilo de vida mostrando '${productName}' em um ambiente moderno e minimalista que se relaciona com seu uso. Iluminação natural suave, profundidade de campo rasa.`,
        `Composição artística com '${productName}' sobre um pedestal ou superfície de mármore. Fundo com gradiente de cor suave. Conceito de luxo e sofisticação.`,
        `Foto de '${productName}' com um efeito de levitação sobre um fundo de cor sólida e vibrante. Conceito criativo e moderno.`,
        `Cena com '${productName}' e elementos gráficos geométricos (círculos, linhas) em um layout de design contemporâneo. Paleta de cores moderna.`,
        `'${productName}' em um cenário abstrato com reflexos e sombras longas. Iluminação de estúdio dramática, criando um clima de mistério e elegância.`,
    ];
    
    const withTextPromises = withTextPrompts.map(p => generateSingleImage(p));
    const cleanPromises = cleanPrompts.map(p => generateSingleImage(p));
    const modernPromises = modernPrompts.map(p => generateSingleImage(p));

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