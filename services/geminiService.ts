
import { GoogleGenAI, Type } from "@google/genai";
import { ProductContent } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. Using a mock response.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const MOCK_RESPONSE: ProductContent = {
  name: "Tênis Esportivo UltraBoost X - Conforto e Performance - Preto/Branco",
  description: "Eleve sua corrida a um novo patamar com o Tênis Esportivo UltraBoost X! 🚀 Projetado para corredores exigentes, este tênis combina tecnologia de ponta com um design moderno e arrojado. Sinta o amortecimento responsivo a cada passo e a leveza que te impulsiona para frente. Perfeito para treinos diários ou competições. Garanta já o seu e sinta a diferença! ✨\n\n**Características Principais:**\n- **Amortecimento Boost:** Retorno de energia incrível a cada passada.\n- **Cabedal Primeknit:** Ajuste perfeito e respirabilidade superior.\n- **Sola de Borracha Continental™:** Aderência excepcional em qualquer condição climática.",
  category: "Calçados > Tênis > Tênis de Corrida",
  brand: "Exemplo Sports",
  sku: "TEN-UBX-PB-41",
  price: 349.90,
  promotionalPrice: 299.90,
  keywords: ["Tênis de Corrida", "Calçado Esportivo", "UltraBoost", "Performance", "Conforto", "Corrida de Rua", "Academia", "Treino", "Calçado Masculino", "Promoção Tênis"],
  variations: [
    { color: "Preto/Branco", size: "40", stock: 15, price: 349.90 },
    { color: "Preto/Branco", size: "41", stock: 20, price: 349.90 },
    { color: "Azul Marinho", size: "41", stock: 8, price: 349.90 },
    { color: "Cinza", size: "42", stock: 12, price: 349.90 },
  ],
  weight: 0.75,
  dimensions: "32 x 22 x 12 cm",
  promotionalSlogan: "Sua Corrida, Seu Limite."
};

const MOCK_IMAGES = [
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSIjMjcyNzI3Ii8+PHBhdGggZD0iTTMwOC4wOTMgNDA4SDIwMy45MDdMMjU2IDMyMS44MUwzMDguMDkzIDQwOFoiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTI1NiAxMDRMMjA1LjM5MyAyNDguNUgyMzIuMDM2TDE5My4yMTQgNDA4SDE2MC4zOTNMMjU2IDEwNFoiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTMxOS42MDcgNDA4SDM1MS42MDdMMzAzLjk2NCAyNDguNUgzMzEuMzlMMjU2IDEwNEwzMTkuNjA3IDQwOFoiIGZpbGw9IndoaXRlIi8+PC9zdmc+',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSIjMjcyNzI3Ii8+PHBhdGggZD0iTTM1MiA0MDhIMTYwTDI1NiAyNTZMMzUyIDQwOFoiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTI1NiAxMDRMMTYwIDI1NkwxOTIgMzA0TDI1NiAxOTJMMzIwIDMwNEwzNTIgMjU2TDI1NiAxMDRaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSIjMjcyNzI3Ii8+PHBhdGggZD0iTTMyMCAxNzZIMTkyVjEwNEgyNTZWMGwxMjggMTI4VjE3NkgzMjBaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0zMjAgMjcySDE5MlYzNTJIMjU2VjQxNkwzODQgMjg4VjI3MkgzMjBaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSIjMjcyNzI3Ii8+PHBhdGggZD0iTTMwNCAyMjRWMzA0SDIyNFYyMjRIMzA0Wk0zMDQgMTEyVjE5MkgzODRWMTEySDMwNFpNMjA4IDMwNEgxMjhWMzg0SDIwOFYzMDRaTTMwNCAzMDRI Mzg0VjM4NEgzMDRWMzA0Wk0yMDggMTkySDI4OFYyNzJNMjA4IDE5MkgxMjhWMTI4SDE5MlYxOTJI MjA4WiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiBmaWxsPSIjMjcyNzI3Ii8+PHBhdGggZD0iTTI1NiA1MS4yTDI5Ny42NTkgMTg0LjQxMkw0NDggMjA1LjI5MUwzMzIuNDY0IDMwOC45ODdMMzYwLjcxOCA0NTguMDIxTDI1NiAzODQuNTg4TDE1MS4yODIgNDU4LjAyMUwxNzkuNTM2IDMwOC45ODdMNDggMjA1LjI5MUwxOTQuMzQxIDE4NC40MTJMMjU2IDUxLjJaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg=='
];

export const generateProductContent = async (
  image: File | null,
  title: string
): Promise<ProductContent> => {
  if (!API_KEY) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(MOCK_RESPONSE);
      }, 1500);
    });
  }

  const model = "gemini-2.5-flash";
  const prompt = `Baseado na imagem e/ou no título do produto fornecido ("${title}"), gere conteúdo completo para um anúncio de e-commerce no estilo da Shopee Brasil. A resposta DEVE ser um objeto JSON.

Pesquise online por produtos similares para sugerir um preço competitivo.

O JSON deve conter:
1. "name": Um nome de produto otimizado para SEO, máximo 120 caracteres.
2. "description": Uma descrição persuasiva e detalhada (máximo 2000 caracteres), usando emojis, destacando benefícios, características e especificações técnicas.
3. "category": A categoria mais apropriada para o produto (ex: "Eletrônicos > Celulares e Acessórios").
4. "brand": A marca do produto. Se não for identificável, retorne uma string vazia.
5. "sku": Um código SKU sugerido (ex: TEN-PRT-42-UBX).
6. "price": Um preço de venda competitivo em BRL, baseado em produtos concorrentes (número).
7. "promotionalPrice": Um preço promocional (opcional, número menor que o preço principal).
8. "keywords": Um array de 10 a 15 tags/palavras-chave relevantes.
9. "variations": Um array de 3 a 5 variações (ex: cor, tamanho). Para cada variação, inclua "color", "size", "stock" (número) e "price" (número). Use valores nulos se não aplicável.
10. "weight": O peso estimado do produto em kg (ex: 0.8).
11. "dimensions": As dimensões estimadas da embalagem em cm (ex: "30 x 20 x 12 cm").
12. "promotionalSlogan": Uma frase de marketing curta e magnética para usar em imagens (máximo 10 palavras).`;

  const parts = [];
  if (image) {
    const imagePart = await fileToGenerativePart(image);
    parts.push(imagePart);
  }
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            brand: { type: Type.STRING },
            sku: { type: Type.STRING },
            price: { type: Type.NUMBER },
            promotionalPrice: { type: Type.NUMBER },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            variations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  color: { type: Type.STRING },
                  size: { type: Type.STRING },
                  stock: { type: Type.NUMBER },
                  price: { type: Type.NUMBER },
                },
              },
            },
            weight: { type: Type.NUMBER },
            dimensions: { type: Type.STRING },
            promotionalSlogan: { type: Type.STRING },
          },
          required: ["name", "description", "category", "price", "keywords", "variations"],
        },
      },
    });

    const jsonString = response.text.trim();
    const parsedJson = JSON.parse(jsonString);
    return parsedJson as ProductContent;

  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Failed to generate content from AI. Please check your prompt and API key.");
  }
};

export const generateProductImages = async (
  productName: string,
  productDescription: string
): Promise<string[]> => {
  if (!API_KEY) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(MOCK_IMAGES);
      }, 2500);
    });
  }

  const prompt = `Uma fotografia de produto com qualidade de estúdio e estilo de vida em HD 4K do seguinte item: '${productName}'. 
  Descrição: '${productDescription}'. 
  A imagem deve ser limpa, profissional e atraente para um anúncio de e-commerce, com espaço negativo e composição adequada para adicionar texto de marketing ou logotipos. 
  Gere 5 variações com diferentes ângulos e cenários.`;

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 5,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
  } catch (error) {
    console.error("Error generating images:", error);
    throw new Error("Falha ao gerar imagens da IA. Tente novamente mais tarde.");
  }
};
