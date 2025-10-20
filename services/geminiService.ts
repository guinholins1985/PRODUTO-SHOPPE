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

const productContentSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Nome do produto conciso e atrativo (máximo 60 caracteres).' },
    description: { type: Type.STRING, description: 'Descrição de marketing persuasiva e detalhada do produto, com pelo menos 3 parágrafos, otimizada para conversão.' },
    category: { type: Type.STRING, description: 'Categoria mais apropriada para o produto em um e-commerce.' },
    brand: { type: Type.STRING, description: 'Marca do produto, se for claramente identificável. Caso contrário, deixe em branco.' },
    sku: { type: Type.STRING, description: 'Sugestão de SKU (Stock Keeping Unit) para o produto, ex: MARCA-PROD-COR.' },
    price: { type: Type.NUMBER, description: 'Preço de venda competitivo sugerido, em BRL, baseado em produtos similares. Use apenas números.' },
    promotionalPrice: { type: Type.NUMBER, description: 'Preço promocional sugerido com um leve desconto, se aplicável, em BRL. Use apenas números.' },
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
  },
  required: ['name', 'description', 'category', 'price', 'keywords', 'variations', 'promotionalSlogan']
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


export const generateProductContent = async (image: File | null, title: string, url: string): Promise<ProductContent> => {
  const model = 'gemini-2.5-pro';
  const parts: any[] = [];
  let config: any = {
    temperature: 0.5,
  };
  let prompt = '';
  
  if (url) {
    prompt = `Como um especialista em marketing de e-commerce, sua tarefa é criar um anúncio de produto completo e persuasivo em Português do Brasil.
    Use a ferramenta de busca do Google para analisar profundamente o conteúdo do link de referência fornecido (${url}) e extraia todas as informações relevantes.
    Com base na análise, gere um JSON que corresponda EXATAMENTE ao seguinte schema. O JSON DEVE estar dentro de um bloco de código markdown (e.g., \`\`\`json ... \`\`\`):
    Schema: ${JSON.stringify(productContentSchema, null, 2)}`;
    
    if (title) {
      prompt += `\n\nPalavras-chave adicionais do usuário para refinar o resultado: ${title}`;
    }
    
    config.tools = [{ googleSearch: {} }];
    parts.push({ text: prompt });

  } else {
    prompt = `Como um especialista em marketing de e-commerce, sua tarefa é criar um anúncio de produto completo e persuasivo em Português do Brasil.
    Analise a imagem e as palavras-chave fornecidas e gere um JSON estruturado com todas as informações necessárias para um cadastro de alta conversão.
    Seja criativo e focado em vendas.`;
    
    if (title) {
      prompt += `\n\nPalavras-chave do usuário para guiar a criação: ${title}`;
    }
    
    config.responseMimeType = "application/json";
    config.responseSchema = productContentSchema;
    
    parts.push({ text: prompt });
    
    if (image) {
      const imagePart = await fileToGenerativePart(image);
      parts.push(imagePart);
    }
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
    let jsonString = responseText;

    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
    }

    try {
        const parsedJson = JSON.parse(jsonString) as ProductContent;

        parsedJson.keywords = parsedJson.keywords || [];
        parsedJson.variations = parsedJson.variations || [];

        return parsedJson;
    } catch (parseError) {
        console.error("Erro ao fazer o parse do JSON:", parseError);
        console.error("JSON string que falhou:", jsonString);
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
    
    const generationPrompt = `Use a imagem fornecida como referência. Gere uma nova foto de produto profissional para e-commerce. A nova imagem deve ter iluminação de estúdio, um fundo de cor sólida e neutra que destaque o produto, e o produto deve estar em foco e nítido. Mantenha o produto idêntico ao original, sem adicionar ou remover elementos.`;

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

    const imageContentPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType.startsWith('image/'));
    
    if (imageContentPart?.inlineData) {
        const base64ImageBytes: string = imageContentPart.inlineData.data;
        return `data:${imageContentPart.inlineData.mimeType};base64,${base64ImageBytes}`;
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