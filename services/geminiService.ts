
import { GoogleGenAI, Type, Modality } from '@google/genai';
import { ProductContent, GeneratedImageSet } from '../types';

// Fix: Initialize the GoogleGenAI client. The API key is read from process.env.API_KEY as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Converts a File object to a GoogleGenerativeAI.Part object.
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
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const productContentSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "Nome do produto conciso e atraente." },
        description: { type: Type.STRING, description: "Descrição de marketing persuasiva e detalhada do produto." },
        category: { type: Type.STRING, description: "Categoria mais apropriada para o produto." },
        brand: { type: Type.STRING, description: "Marca do produto, se identificável." },
        sku: { type: Type.STRING, description: "Um código SKU sugerido para o produto." },
        price: { type: Type.NUMBER, description: "Preço de venda competitivo sugerido em BRL." },
        promotionalPrice: { type: Type.NUMBER, description: "Preço promocional sugerido, se aplicável." },
        keywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Uma lista de palavras-chave relevantes para SEO."
        },
        variations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    color: { type: Type.STRING },
                    size: { type: Type.STRING },
                    stock: { type: Type.INTEGER },
                    price: { type: Type.NUMBER },
                },
            },
            description: "Lista de variações do produto (cor, tamanho, etc.), se aplicável."
        },
        weight: { type: Type.NUMBER, description: "Peso estimado do produto em kg." },
        dimensions: { type: Type.STRING, description: "Dimensões estimadas da embalagem no formato 'C x L x A cm'." },
        promotionalSlogan: { type: Type.STRING, description: "Um slogan curto e cativante para campanhas de marketing." },
    },
    required: ["name", "description", "category", "price", "keywords", "variations"]
};

/**
 * Generates product content using the Gemini API.
 */
export const generateProductContent = async (
  image: File | null,
  title: string,
  url: string
): Promise<ProductContent> => {
  const parts: any[] = [];
  let prompt = `Com base nas informações fornecidas, gere um conteúdo completo para a listagem de um produto de e-commerce. O tom deve ser vendedor e persuasivo, focado no público brasileiro.

Informações disponíveis:
`;

  if (image) {
      const imagePart = await fileToGenerativePart(image);
      parts.push(imagePart);
      prompt += `- Imagem do produto.\n`;
  }
  if (title) {
      prompt += `- Palavras-chave/Título: ${title}\n`;
  }
  if (url) {
      prompt += `- Link de referência: ${url}\n`;
  }

  prompt += `
Instruções:
1.  **Nome do Produto:** Crie um nome claro, conciso e otimizado para busca.
2.  **Descrição Persuasiva:** Elabore uma descrição rica em detalhes, destacando os benefícios e características principais. Use parágrafos curtos e bullet points para facilitar a leitura.
3.  **Categoria:** Sugira a categoria mais adequada.
4.  **Preço:** Sugira um preço competitivo em BRL. Se aplicável, sugira um preço promocional.
5.  **Variações:** Se a imagem ou o título sugerir variações (cores, tamanhos), liste-as. Caso contrário, retorne um array vazio.
6.  **Logística:** Estime o peso (kg) e as dimensões da embalagem (C x L x A cm).
7.  **Marketing:** Crie um slogan promocional curto e impactante.
8.  **SEO:** Gere uma lista de palavras-chave relevantes.

A saída deve ser estritamente um objeto JSON que corresponda ao schema fornecido. Não inclua markdown ou qualquer texto fora do JSON.
`;
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
        // Fix: Use a model appropriate for complex text tasks and JSON generation.
        model: 'gemini-2.5-pro',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: productContentSchema as any,
        },
    });

    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as ProductContent;
  } catch(e) {
      console.error("Error generating product content:", e);
      throw new Error("Não foi possível gerar o conteúdo do produto. Verifique o console para mais detalhes.");
  }
};

/**
 * Generates product marketing images using the Gemini API.
 */
export const generateProductImages = async (
  content: ProductContent,
  baseImage: File | null
): Promise<GeneratedImageSet> => {
  if (!baseImage) {
    console.warn("generateProductImages called without a base image. Returning empty set.");
    return { withText: [], clean: [], modern: [] };
  }

  const imagePart = await fileToGenerativePart(baseImage);

  const generateImage = async (prompt: string): Promise<string | null> => {
      try {
          const response = await ai.models.generateContent({
              // Fix: Use a model appropriate for image generation and editing.
              model: 'gemini-2.5-flash-image',
              contents: {
                  parts: [
                      imagePart,
                      { text: prompt }
                  ]
              },
              config: {
                  responseModalities: [Modality.IMAGE],
              },
          });
          
          const firstCandidate = response.candidates?.[0];
          if (firstCandidate) {
            for (const part of firstCandidate.content.parts) {
                if (part.inlineData) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
          }
          return null;
      } catch (error) {
          console.error("Image generation failed for prompt:", prompt, error);
          return null;
      }
  };

  const prompts = {
      withText: [
          `Adicione o texto promocional "${content.promotionalSlogan}" a esta imagem de produto de forma criativa e legível. Use uma fonte moderna e atraente.`,
          `Crie um banner para redes sociais a partir desta imagem, incluindo a frase de efeito: "${content.promotionalSlogan}". O design deve ser vibrante.`,
          `Incorpore o slogan "${content.promotionalSlogan}" nesta imagem, como se fosse parte de um anúncio de revista de luxo.`,
          `Gere uma versão desta imagem com o texto "${content.promotionalSlogan}" em uma faixa elegante na parte inferior.`,
          `Sobreponha o texto "${content.promotionalSlogan}" nesta imagem com um efeito de neon sutil.`
      ],
      clean: [
          `Remova o fundo desta imagem e substitua por um fundo branco puro de estúdio (#FFFFFF). Ajuste a iluminação para que seja profissional e focada no produto.`,
          `Isole o produto desta imagem em um fundo cinza claro (#F5F5F5). Garanta que as sombras sejam suaves e naturais.`,
          `Crie uma foto de produto limpa (packshot) a partir desta imagem, com fundo branco e um leve reflexo na base.`,
          `Otimize esta imagem para um catálogo de e-commerce: fundo branco, sem distrações, e com cores bem definidas.`,
          `Recorte o produto e coloque-o sobre um fundo branco. A imagem deve parecer ter sido tirada em um estúdio fotográfico profissional.`
      ],
      modern: [
          `Coloque este produto em um cenário de estilo de vida moderno e minimalista que combine com ele. Use iluminação dramática.`,
          `Crie uma composição artística com este produto, usando elementos geométricos e uma paleta de cores moderna e contrastante.`,
          `Gere uma imagem "flat lay" deste produto, cercado por acessórios relevantes que contem uma história.`,
          `Mostre este produto em uso em um ambiente urbano e contemporâneo. A imagem deve ter uma sensação de movimento e energia.`,
          `Crie uma imagem conceitual e abstrata que destaque a principal característica deste produto. Use cores vibrantes e formas dinâmicas.`
      ]
  };

  const withTextPromises = prompts.withText.map(p => generateImage(p));
  const cleanPromises = prompts.clean.map(p => generateImage(p));
  const modernPromises = prompts.modern.map(p => generateImage(p));

  try {
    const [withText, clean, modern] = await Promise.all([
        Promise.all(withTextPromises),
        Promise.all(cleanPromises),
        Promise.all(modernPromises),
    ]);
    
    return { 
        withText: withText.filter((img): img is string => img !== null), 
        clean: clean.filter((img): img is string => img !== null), 
        modern: modern.filter((img): img is string => img !== null),
    };
  } catch(e) {
    console.error("Error generating product images:", e);
    throw new Error("Não foi possível gerar as imagens do produto. Verifique o console para mais detalhes.");
  }
};
