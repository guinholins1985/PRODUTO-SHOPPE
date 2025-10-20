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


export const generateProductContent = async (image: File | null, title: string, url: string): Promise<ProductContent> => {
  const model = 'gemini-2.5-pro'; // Using Google's most powerful model for maximum quality.
  const parts: any[] = [];
  let config: any = {
    temperature: 0.5,
  };
  let prompt = '';
  
  if (url) {
    // URL-based generation logic - FIXED
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
    // Image-based generation logic
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
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: parts }],
      config: config,
    });

    const responseText = response.text.trim();
    let jsonString = responseText;

    // More robustly find the JSON block, which might be wrapped in ```json ... ``` or just be the raw text.
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
        jsonString = jsonMatch[1];
    }

    try {
        const parsedJson = JSON.parse(jsonString) as ProductContent;

        // Defensive coding: ensure arrays are not undefined if model omits them
        parsedJson.keywords = parsedJson.keywords || [];
        parsedJson.variations = parsedJson.variations || [];

        return parsedJson;
    } catch (parseError) {
        console.error("Erro ao fazer o parse do JSON:", parseError);
        console.error("JSON string que falhou:", jsonString);
        throw new Error("A IA retornou uma resposta em formato inválido. Tente novamente com um prompt ou imagem diferente.");
    }

  } catch (error) {
    console.error("Erro ao gerar conteúdo do produto:", error);
    const reason = url ? "a URL é inválida ou inacessível" : "a imagem não pôde ser processada";
    throw new Error(`Não foi possível gerar os detalhes do produto. A API pode estar ocupada ou ${reason}. Tente novamente.`);
  }
};

export const generateProductImages = async (image: File, content: ProductContent): Promise<GeneratedProductImage> => {
  try {
    const imagePart = await fileToGenerativePart(image);
    
    // A prompt designed to generate a new professional-looking image based on the original.
    const generationPrompt = `Use a imagem fornecida como referência. Gere uma nova foto de produto profissional para e-commerce. A nova imagem deve ter iluminação de estúdio, um fundo de cor sólida e neutra que destaque o produto, e o produto deve estar em foco e nítido. Mantenha o produto idêntico ao original, sem adicionar ou remover elementos.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          imagePart, // The original image as reference
          { text: generationPrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Safely access and extract the image data from the response
    const imageContentPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType.startsWith('image/'));
    
    if (imageContentPart?.inlineData) {
        const base64ImageBytes: string = imageContentPart.inlineData.data;
        return `data:${imageContentPart.inlineData.mimeType};base64,${base64ImageBytes}`;
    }
    
    console.warn("Nenhuma imagem gerada na resposta da API.", response);
    // Throw a specific error if no image is returned
    throw new Error("A IA não retornou uma imagem. Tente usar uma imagem diferente ou com melhor qualidade.");

  } catch (error) {
    console.error("Erro ao gerar a imagem do produto:", error);
    // Corrected error message to be more specific and helpful.
    throw new Error("Ocorreu um erro ao gerar a imagem. A API pode estar ocupada ou o formato da imagem não é suportado. Tente novamente com outro arquivo.");
  }
};