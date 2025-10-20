import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProductContent, GeneratedProductImage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

const base64ToGenerativePart = (base64Data: string) => {
  const match = base64Data.match(/^data:(image\/.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid base64 data URL format");
  }
  const mimeType = match[1];
  const data = match[2];
  return {
    inlineData: {
      data,
      mimeType,
    },
  };
};

const productContentSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Nome do produto conciso e atrativo (máximo 60 caracteres).' },
    description: { type: Type.STRING, description: 'Descrição de marketing persuasiva e detalhada do produto, com pelo menos 3 parágrafos, otimizada para conversão.' },
    category: { type: Type.STRING, description: 'Categoria mais apropriada para o produto em um e-commerce.' },
    brand: { type: Type.STRING, description: 'Marca do produto, se for claramente identificável. Caso contrário, deixe em branco.' },
    sku: { type: Type.STRING, description: 'Sugestão de SKU (Stock Keeping Unit) para o produto, ex: MARCA-PROD-COR.' },
    price: { type: Type.NUMBER, description: 'Preço de venda competitivo sugerido, em BRL, baseado em produtos similares. Use apenas números.' },
    promotionalPrice: { type: Type.NUMBER, description: 'Calcule e sugira um preço promocional com um desconto atraente (ex: 10-20% menor que o preço principal), em BRL. Use apenas números.' },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Lista de 8 a 12 palavras-chave (tags) relevantes para SEO e busca no e-commerce.'
    },
    variations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          color: { type: Type.STRING, description: 'Cor da variação do produto.' },
          size: { type: Type.STRING, description: 'Tamanho da variação do produto (ex: P, M, G, 38, 40).' },
          stock: { type: Type.INTEGER, description: 'Estoque inicial sugerido para a variação (ex: 50, 100).' },
          price: { type: Type.NUMBER, description: 'Preço específico para a variação, se diferente do principal. Use apenas números.' },
        },
      },
      description: 'Lista de 1 a 3 possíveis variações do produto (cor, tamanho, etc.). Se não houver variações claras, retorne um array vazio.'
    },
    weight: { type: Type.NUMBER, description: 'Peso estimado do produto em quilogramas (kg) para cálculo de frete. Use apenas números.' },
    dimensions: { type: Type.STRING, description: 'Dimensões estimadas da embalagem no formato "C x L x A cm", ex: "25 x 15 x 10 cm".' },
    promotionalSlogan: { type: Type.STRING, description: 'Um slogan promocional curto e cativante para o produto (máximo 10 palavras).' },
    imageTextSuggestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Gere uma lista com EXATAMENTE 10 sugestões de textos curtos e otimizados para usar em imagens de marketing. Os textos devem ser chamativos, de alto valor comercial e persuasivos. Ex: "Frete Grátis Hoje!", "50% OFF", "Edição Limitada".'
    },
    imageTextPlacementSuggestions: {
        type: Type.STRING,
        description: `Com base na análise da imagem do produto, forneça um guia passo a passo detalhado e claro sobre como aplicar os textos sugeridos na imagem para máximo impacto. Organize as dicas em etapas numeradas (ex: '1. Posição: ...\\n2. Cores e Contraste: ...\\n3. Tipografia: ...'). Seja específico, sugerindo locais exatos (canto superior direito), cores (vermelho para promoções) e estilos de fonte (negrito, sem serifa) que combinem com a imagem fornecida.`
    },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Gere uma lista de 5 a 10 hashtags relevantes e populares para redes sociais como Instagram e TikTok, relacionadas ao produto. Ex: #ModaFeminina #Verao2024'
    },
    coupon: {
      type: Type.OBJECT,
      properties: {
        code: { type: Type.STRING, description: 'Crie um código de cupom de desconto curto e memorável, com letras e números. Ex: PROMO15, MEGA10.' },
        phrase: { type: Type.STRING, description: 'Crie uma frase promocional curta para divulgar o cupom. Ex: "Use o cupom PROMO15 e ganhe 15% de desconto!"' }
      },
      description: 'Gere um cupom de desconto para o produto.'
    },
    metaTitle: { type: Type.STRING, description: 'Título otimizado para SEO, ideal para a tag <title> do Google (máximo 60 caracteres).' },
    metaDescription: { type: Type.STRING, description: 'Meta descrição persuasiva para o Google, resumindo o produto e incentivando o clique (máximo 160 caracteres).' },
    slug: { type: Type.STRING, description: "URL amigável (slug) para o produto, usando palavras-chave, tudo em minúsculas e separado por hifens. Ex: 'tenis-corrida-masculino-preto'." },
    imageAltText: { type: Type.STRING, description: 'Texto alternativo (alt text) descritivo para a imagem principal do produto, focado em acessibilidade e SEO.' },
    socialMediaPost: {
      type: Type.STRING,
      description: 'Crie uma legenda de post para Instagram ou Facebook. O texto deve ser envolvente, usar emojis relevantes, descrever os benefícios do produto e terminar com uma chamada para ação clara (call-to-action). Inclua 3-5 das hashtags geradas no final.'
    },
    videoScript: {
      type: Type.OBJECT,
      description: 'Crie um roteiro curto para um vídeo de 15-30 segundos para Reels ou TikTok. O roteiro deve ser dividido em 3 cenas rápidas e dinâmicas.',
      properties: {
        title: { type: Type.STRING, description: 'Um título chamativo para o vídeo.' },
        scenes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              scene: { type: Type.STRING, description: 'O número e nome da cena (ex: "Cena 1: Unboxing Rápido").' },
              description: { type: Type.STRING, description: 'Descrição visual e narração/texto para a cena.' }
            }
          },
          description: 'Uma lista contendo exatamente 3 cenas para o vídeo.'
        }
      }
    }
  },
  required: ['name', 'description', 'category', 'price', 'keywords', 'variations', 'promotionalSlogan', 'imageTextSuggestions', 'imageTextPlacementSuggestions', 'hashtags', 'coupon', 'metaTitle', 'metaDescription', 'slug', 'imageAltText', 'socialMediaPost', 'videoScript']
};

/**
 * A robust retry wrapper for async functions with exponential backoff.
 * @param fn The async function to execute.
 * @param retries Number of retry attempts.
 * @param delay Delay in ms for the first retry.
 * @returns The result of the async function.
 */
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Attempt ${i + 1} of ${retries} failed. Retrying in ${delay * Math.pow(2, i)}ms...`);
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
};


export const generateProductContent = async (image: File | null, title: string): Promise<ProductContent> => {
  const model = 'gemini-2.5-pro';
  const parts: any[] = [];
  
  let prompt = `Como um especialista em marketing de e-commerce e redator profissional, nativo do Brasil, sua tarefa é criar um anúncio de produto completo, persuasivo e ortograficamente impecável em Português do Brasil. Utilize um dicionário abrangente da língua portuguesa para garantir a precisão lexical, a riqueza do vocabulário e a naturalidade da linguagem.
    Analise a imagem e as palavras-chave fornecidas e gere um JSON estruturado com todas as informações necessárias para um cadastro de alta conversão.
    Seja criativo, focado em vendas, e garanta que todos os textos gerados (nomes, descrições, slogans) sejam revisados para garantir que não contenham erros gramaticais ou de digitação.`;
    
  if (title) {
    prompt += `\n\nPalavras-chave do usuário para guiar a criação: ${title}`;
  }
  
  const config: any = {
    temperature: 0.5,
    responseMimeType: "application/json",
    responseSchema: productContentSchema,
  };
  
  parts.push({ text: prompt });
  
  if (image) {
    const imagePart = await fileToGenerativePart(image);
    parts.push(imagePart);
  }

  try {
    const response = await withRetry(async () => {
        const result = await ai.models.generateContent({
            model: model,
            contents: [{ parts: parts }],
            config: config,
        });
        if (result.promptFeedback?.blockReason) {
            throw new Error(`A geração de conteúdo foi bloqueada pela política de segurança: ${result.promptFeedback.blockReason}.`);
        }
        return result;
    });

    const responseText = response.text.trim();
    
    try {
        const parsedJson = JSON.parse(responseText) as ProductContent;

        parsedJson.keywords = parsedJson.keywords || [];
        parsedJson.variations = parsedJson.variations || [];
        parsedJson.imageTextSuggestions = parsedJson.imageTextSuggestions || [];
        parsedJson.imageTextPlacementSuggestions = parsedJson.imageTextPlacementSuggestions || '';
        parsedJson.hashtags = parsedJson.hashtags || [];
        parsedJson.coupon = parsedJson.coupon || { code: '', phrase: '' };
        parsedJson.metaTitle = parsedJson.metaTitle || '';
        parsedJson.metaDescription = parsedJson.metaDescription || '';
        parsedJson.slug = parsedJson.slug || '';
        parsedJson.imageAltText = parsedJson.imageAltText || '';
        parsedJson.socialMediaPost = parsedJson.socialMediaPost || '';
        parsedJson.videoScript = parsedJson.videoScript || { title: '', scenes: [] };

        return parsedJson;
    } catch (parseError) {
        console.error("Erro ao fazer o parse do JSON:", parseError);
        console.error("JSON string que falhou:", responseText);
        throw new Error("A IA retornou uma resposta em formato inválido. Tente novamente com um prompt ou imagem diferente.");
    }

  } catch (error) {
    console.error("Falha ao gerar conteúdo do produto após múltiplas tentativas:", error);
    if (error instanceof Error && error.message.includes('política de segurança')) {
        throw error;
    }
    throw new Error("Não foi possível gerar os detalhes do produto. A API pode estar instável ou a entrada é inválida. Tente novamente.");
  }
};

export const generateProductImages = async (image: File, content: ProductContent): Promise<GeneratedProductImage> => {
  try {
    const imagePart = await fileToGenerativePart(image);
    
    const generationPrompt = `Sua tarefa é aprimorar a imagem do produto fornecida para uso em e-commerce.
1. Analise a imagem atual. Se o fundo estiver poluído, com distrações ou de baixa qualidade, substitua-o por um fundo de cor sólida e neutra que complemente e destaque o produto. Use iluminação de estúdio profissional.
2. Se o fundo já for limpo e profissional (como um fundo de estúdio), mantenha-o, mas aprimore a iluminação, nitidez e cores para tornar a imagem ainda mais atraente.
3. O produto em si deve permanecer idêntico ao original, sem alterações.
4. O resultado final deve ser uma imagem de alta qualidade, limpa, e pronta para um anúncio, sem nenhum texto adicionado.`;

    const response = await withRetry(async () => {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            imagePart,
            { text: generationPrompt },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });
      
      if (result.promptFeedback?.blockReason) {
        throw new Error(`A imagem foi bloqueada pela política de segurança: ${result.promptFeedback.blockReason}. Tente uma imagem diferente.`);
      }
      return result;
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
    }
    
    console.warn("API response did not contain an image.", response);
    throw new Error("A IA não retornou uma imagem, embora a solicitação tenha sido bem-sucedida. Tente usar uma imagem diferente.");

  } catch (error) {
    console.error("Falha ao gerar a imagem do produto após múltiplas tentativas:", error);
    if (error instanceof Error && error.message.includes('política de segurança')) {
      throw error;
    }
    throw new Error("Não foi possível gerar a imagem. A API pode estar instável ou sobrecarregada. Por favor, tente novamente mais tarde.");
  }
};

export const generateProductMockups = async (base64Image: string, content: ProductContent): Promise<string[]> => {
    if (!base64Image) return [];

    const productContext = `O produto é da categoria "${content.category}" e descrito como: "${content.description.substring(0, 150)}...".`;

    const mockupPrompts = [
        `Crie um mockup de estilo de vida (lifestyle). ${productContext} Coloque o produto em um ambiente realista e coerente. Por exemplo, se for um tênis de corrida, mostre-o em uma academia ou pista. Se for um item de cozinha, em uma cozinha moderna. A iluminação deve ser natural e atraente.`,
        `Crie um mockup para uma postagem de rede social. ${productContext} Posicione o produto em um fundo de cor única e vibrante que complemente suas cores. Adicione sombras suaves e sutis para um efeito 3D. O estilo deve ser moderno e limpo.`,
        `Crie um mockup luxuoso. ${productContext} Coloque o produto sobre uma superfície elegante, como mármore, madeira escura ou tecido de veludo. Use iluminação lateral suave para destacar texturas e criar uma atmosfera sofisticada.`,
        `Crie um mockup minimalista e conceitual. ${productContext} Apresente o produto flutuando levemente, com um fundo de gradiente suave entre duas cores pastel. O foco total deve estar no produto, com o mínimo de distração.`
    ];

    try {
        const imagePart = base64ToGenerativePart(base64Image);

        const mockupPromises = mockupPrompts.map(prompt => {
            return withRetry(async () => {
                const result = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [
                            imagePart,
                            { text: prompt },
                        ],
                    },
                    config: {
                        responseModalities: [Modality.IMAGE],
                    },
                });
                if (result.promptFeedback?.blockReason) {
                    console.warn(`Mockup generation was blocked: ${result.promptFeedback.blockReason}`);
                    return null;
                }
                for (const part of result.candidates[0].content.parts) {
                    if (part.inlineData) {
                       return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                }
                return null;
            });
        });

        const results = await Promise.all(mockupPromises);
        return results.filter((result): result is string => result !== null);

    } catch (error) {
        console.error("Failed to generate product mockups:", error);
        return [];
    }
};

export const generateCouponBanner = async (couponCode: string, promotionalPhrase: string, base64ProductImage: string): Promise<GeneratedProductImage> => {
    try {
        const imagePart = base64ToGenerativePart(base64ProductImage);
        
        const prompt = `Sua tarefa é criar um banner promocional 16:9, vibrante e chamativo, para uma loja de e-commerce. Incorpore a imagem do produto fornecida de forma harmoniosa. O banner deve destacar o código de desconto "${couponCode}" e a frase "${promotionalPhrase}". É absolutamente crucial que todo o texto no banner seja escrito em Português do Brasil e seja ortograficamente impecável. Revise cada palavra, caractere e acento para garantir 100% de precisão. Não são permitidos erros de NENHUM tipo. Use um design moderno, com tipografia em negrito e de fácil leitura. A paleta de cores deve complementar o produto. O resultado final deve ser profissional e pronto para marketing.`;
        
        const response = await withRetry(async () => {
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [imagePart, { text: prompt }],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            if (result.promptFeedback?.blockReason) {
                throw new Error(`A imagem do banner foi bloqueada pela política de segurança: ${result.promptFeedback.blockReason}.`);
            }
            return result;
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
            }
        }
    
        console.warn("API response did not contain a coupon banner image.", response);
        return null;

    } catch (error) {
        console.error("Falha ao gerar o banner do cupom:", error);
        return null;
    }
};