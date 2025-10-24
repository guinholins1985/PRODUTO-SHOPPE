
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProductContent, GeneratedProductImage, ApiKeySet, SupportedAIService } from '../types';

const getApiKeyForService = (service: SupportedAIService): string => {
  const keysString = localStorage.getItem('ai_api_keys');
  if (keysString) {
    try {
      const keys: ApiKeySet = JSON.parse(keysString);
      if (keys[service]) {
        return keys[service]!;
      }
    } catch (e) {
      console.error("Failed to parse API keys from localStorage", e);
    }
  }

  // Fallback specific for Gemini using process.env
  if (service === 'gemini' && process.env.API_KEY) {
      return process.env.API_KEY;
  }
  
  throw new Error(`API Key para '${service}' não configurada. O administrador precisa configurar a chave no painel de admin.`);
};


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
  const ai = new GoogleGenAI({ apiKey: getApiKeyForService('gemini') });
  const model = 'gemini-2.5-pro';
  const parts: any[] = [];
  
  const systemInstruction = `Você é um especialista em marketing digital e e-commerce, fluente em Português do Brasil. Sua principal função é criar conteúdo de marketing de alta qualidade que seja persuasivo, otimizado para SEO e, acima de tudo, ortograficamente perfeito. Cada palavra deve ser revisada para garantir precisão gramatical e de acentuação, seguindo as normas da língua portuguesa. Aderir estritamente ao schema JSON fornecido é mandatório.`;
  
  let prompt = `Analise a imagem e as palavras-chave. Sua tarefa é gerar um JSON estruturado para um produto. **PRIORIDADE MÁXIMA: TODO o texto gerado, sem exceção, deve estar em Português do Brasil, com gramática, ortografia e acentuação perfeitas.** Revise cada campo antes de finalizar. O conteúdo deve ser criativo e focado em vendas. Se as palavras-chave do usuário estiverem em outro idioma, traduza a intenção para o Português do Brasil e gere todo o conteúdo nesse idioma.`;
    
  if (title) {
    prompt += `\n\nPalavras-chave do usuário para guiar a criação: ${title}`;
  }
  
  const config: any = {
    systemInstruction: systemInstruction,
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

        // Ensure all potentially missing fields are initialized to avoid runtime errors
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

export const generateImageFromText = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKeyForService('gemini') });
  const model = 'gemini-2.5-flash'; // Using the user-provided Gemini Flash model for initial image generation

  try {
    const response = await withRetry(async () => {
      const result = await ai.models.generateContent({
        model: model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.IMAGE], // Request an image response
        },
      });

      if (result.promptFeedback?.blockReason) {
        throw new Error(`A geração de imagem foi bloqueada pela política de segurança: ${result.promptFeedback.blockReason}. Tente um prompt diferente.`);
      }
      return result;
    });

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          // Return as a full data URL string
          return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
      }
    }

    console.warn("API response did not contain an image.", response);
    throw new Error("A IA não retornou uma imagem para o prompt fornecido. Tente um prompt diferente ou mais descritivo.");

  } catch (error) {
    console.error("Falha ao gerar imagem a partir do texto após múltiplas tentativas:", error);
    if (error instanceof Error && error.message.includes('política de segurança')) {
      throw error;
    }
    throw new Error("Não foi possível gerar a imagem a partir do texto. A API pode estar instável ou a entrada é inválida. Por favor, tente novamente.");
  }
};


export const generateProductImages = async (image: File): Promise<GeneratedProductImage> => {
  const ai = new GoogleGenAI({ apiKey: getApiKeyForService('gemini') });
  try {
    const imagePart = await fileToGenerativePart(image);
    
    const generationPrompt = `Sua tarefa é refinar a imagem de produto fornecida para um padrão de publicidade de altíssima qualidade, comparável a uma edição profissional em Photoshop.
1.  **Fundo Perfeito:** Se o fundo atual não for profissional, remova-o completamente e substitua por um fundo branco puro (#FFFFFF) ou de gradiente cinza muito sutil. O produto deve parecer estar em um estúdio fotográfico.
2.  **Qualidade Superior:** Aumente a nitidez, melhore o contraste e equilibre as cores para que o produto pareça vibrante e real. Aplique iluminação de estúdio profissional para eliminar sombras indesejadas e destacar os detalhes.
3.  **Fidelidade ao Produto:** O produto em si deve ser 100% preservado, sem distorções ou alterações em sua forma ou cor.
4.  **Resultado Final:** A imagem deve ser ultra-detalhada, em alta definição (qualidade 4K), limpa e pronta para um e-commerce de luxo. Não adicione nenhum texto.`;

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

    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const base64ImageBytes: string = part.inlineData.data;
          return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
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
    const ai = new GoogleGenAI({ apiKey: getApiKeyForService('gemini') });
    if (!base64Image) return [];

    const productContext = `O produto é da categoria "${content.category}" e descrito como: "${content.description.substring(0, 150)}...".`;
    const finalInstruction = "Não adicione NENHUM texto, logo ou elemento gráfico. A imagem deve conter apenas o produto no cenário descrito.";

    // Detecta se o produto é uma peça de vestuário para adicionar um modelo humano.
    const apparelKeywords = ['roupa', 'vestuário', 'moda', 'camiseta', 'camisa', 'calça', 'vestido', 'saia', 'short', 'blusa', 'jaqueta', 'casaco', 'moletom'];
    const isApparel = apparelKeywords.some(keyword => content.category.toLowerCase().includes(keyword));

    let modelInstruction = '';
    if (isApparel) {
        modelInstruction = `Como este produto é uma peça de vestuário, a imagem DEVE mostrar o produto sendo usado por um modelo humano (homem, mulher ou criança, conforme apropriado para o produto) em uma pose natural e atraente. O rosto do modelo pode estar visível ou não, mas o foco principal deve ser em como a roupa veste no corpo, mostrando seu caimento e estilo.`;
    }

    const mockupPrompts = [
        `Crie um mockup de estilo de vida (lifestyle) fotorrealista e em alta definição. ${productContext} Coloque o produto em um ambiente realista e coerente. ${modelInstruction} A iluminação deve ser natural, cinematográfica e atraente, com profundidade de campo. ${finalInstruction}`,
        `Crie um mockup para uma postagem de rede social, com qualidade de estúdio. ${productContext} ${modelInstruction} Se um modelo for usado, posicione-o em um fundo de cor única e vibrante que complemente as cores do produto. Adicione sombras suaves e realistas para um efeito 3D. O estilo deve ser moderno, limpo e em altíssima resolução. ${finalInstruction}`,
        `Crie um mockup luxuoso e em alta definição. ${productContext} Crie um cenário sofisticado. ${modelInstruction} Use iluminação lateral dramática para destacar texturas e criar uma atmosfera premium. ${finalInstruction}`,
        `Crie um mockup minimalista e conceitual, ultra-limpo. ${productContext} ${modelInstruction} Apresente o modelo contra um fundo de gradiente sutil. O foco deve ser absoluto no produto, com renderização nítida e detalhada. ${finalInstruction}`
    ];

    const generatedMockups: string[] = [];

    // Executa as chamadas em série para evitar erros de limite de taxa da API (rate limiting)
    // e aumentar a confiabilidade da geração de imagens.
    for (const prompt of mockupPrompts) {
        try {
            const imagePart = base64ToGenerativePart(base64Image);
            
            // Cada mockup é gerado individualmente com sua própria lógica de retry.
            const resultUrl = await withRetry(async () => {
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
                    console.warn(`A geração de mockup foi bloqueada: ${result.promptFeedback.blockReason}`);
                    return null; // Retorna nulo se bloqueado, para não quebrar o loop.
                }

                const candidate = result.candidates?.[0];
                if (candidate?.content?.parts) {
                  for (const part of candidate.content.parts) {
                    if (part.inlineData) {
                      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    }
                  }
                }
                return null;
            });
            
            if (resultUrl) {
                generatedMockups.push(resultUrl);
            }
        } catch (error) {
            // Se um mockup individual falhar, registra o erro e continua para o próximo.
            console.error(`Falha ao gerar um mockup para o prompt: "${prompt.substring(0, 50)}..."`, error);
        }
        // Adiciona um pequeno atraso antes da próxima iteração para reduzir ainda mais a carga de pico.
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    return generatedMockups;
};
