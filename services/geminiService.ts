import { GoogleGenAI, Modality, Type } from '@google/genai';
import { ProductContent, GeneratedImageSet } from '../types';

// Helper function to convert File to base64 for the API
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // remove the `data:...;base64,` part
      resolve((reader.result as string).split(',')[1]);
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define the JSON schema for the product content
const productContentSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Título do produto otimizado para SEO, com 50-70 caracteres." },
    description: { type: Type.STRING, description: "Descrição de produto persuasiva e detalhada, usando parágrafos, emojis e markdown. Destaque 3 características principais com bullet points." },
    category: { type: Type.STRING, description: "Sugestão de categoria no formato 'Principal > Subcategoria > Sub-subcategoria'." },
    brand: { type: Type.STRING, description: "Marca do produto, se identificável." },
    sku: { type: Type.STRING, description: "Sugestão de um código SKU (Stock Keeping Unit) para o produto." },
    price: { type: Type.NUMBER, description: "Sugestão de preço competitivo com base no produto." },
    promotionalPrice: { type: Type.NUMBER, description: "Sugestão de preço promocional, ligeiramente inferior ao preço normal." },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Array com 10 a 15 palavras-chave relevantes para SEO."
    },
    variations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          color: { type: Type.STRING },
          size: { type: Type.STRING },
          stock: { type: Type.INTEGER },
          price: { type: Type.NUMBER }
        },
        required: ["color", "size"]
      },
      description: "Array de possíveis variações do produto (cor, tamanho). Se não houver, retorne um array vazio."
    },
    weight: { type: Type.NUMBER, description: "Peso estimado do produto em quilogramas (kg)." },
    dimensions: { type: Type.STRING, description: "Dimensões estimadas da embalagem no formato 'C x L x A cm'." },
    promotionalSlogan: { type: Type.STRING, description: "Um slogan promocional curto e cativante para o produto." }
  },
  required: ["name", "description", "category", "price", "keywords", "variations"]
};


export const generateProductContent = async (
  image: File | null,
  title: string
): Promise<ProductContent> => {
  const model = 'gemini-2.5-flash';
  const parts: any[] = [];

  let prompt = `Você é um especialista em e-commerce e marketing digital. Sua tarefa é criar o conteúdo completo para a página de um produto.
  
  Analise a imagem e/ou o título fornecido e gere uma resposta JSON estruturada de acordo com o schema fornecido. Seja criativo, persuasivo e otimizado para SEO.
  
  **Título Fornecido pelo Usuário (use como base):** "${title}"
  `;

  if (image) {
    prompt += "\n\n**Imagem Fornecida:** Analise os detalhes visuais da imagem para extrair características, estilo, material e público-alvo.";
    const imagePart = await fileToGenerativePart(image);
    parts.push(imagePart);
  } else {
     prompt += "\n\n**Nenhuma Imagem Fornecida:** Baseie sua resposta inteiramente no título fornecido.";
  }
  
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: productContentSchema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text.trim();
    const generatedContent = JSON.parse(jsonText) as ProductContent;
    
    // Ensure variations is always an array to prevent crashes
    if (!generatedContent.variations) {
        generatedContent.variations = [];
    }

    return generatedContent;
  } catch (error) {
    console.error("Error generating product content:", error);
    throw new Error("Falha ao gerar conteúdo da IA. Verifique o console para mais detalhes.");
  }
};

const generateSingleImage = async (prompt: string, imagePart: any): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
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

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null; // Should not happen if successful
    } catch (error) {
        console.error("Error generating single image:", error);
        return null; // Return null on failure for Promise.allSettled
    }
};

export const generateProductImages = async (
  content: ProductContent,
  imageFile: File | null
): Promise<GeneratedImageSet> => {
  if (!imageFile) {
      console.error("Image file is required to generate image variations.");
      return { withText: [], clean: [], modern: [] };
  }

  const imagePart = await fileToGenerativePart(imageFile);

  const prompts = {
      withText: [
        `Crie uma imagem de marketing para "${content.name}" com o slogan "${content.promotionalSlogan}" em um texto elegante.`,
        `Gere um banner promocional para este produto, destacando uma oferta especial com texto chamativo.`,
        `Elabore uma imagem para redes sociais com um texto magnético e um call-to-action, como "Compre Agora!".`,
        `Crie uma imagem com o nome do produto e 2-3 características chave em texto sobreposto.`,
        `Desenvolva uma imagem de anúncio para este produto com um design limpo e texto que destaque o preço promocional de R$${content.promotionalPrice}.`
      ],
      clean: [
          `Gere uma foto de estúdio profissional deste produto em um fundo branco infinito.`,
          `Crie uma imagem de produto limpa e otimizada com um fundo cinza claro e sombras suaves.`,
          `Produza uma imagem minimalista do produto, focada nos detalhes e na textura, em fundo neutro.`,
          `Gere um "flat lay" (vista de cima) do produto com uma composição limpa e organizada.`,
          `Crie uma imagem do produto em um fundo de cor sólida que complemente as cores do item.`
      ],
      modern: [
          `Crie uma imagem moderna para este produto com iluminação de néon e um fundo escuro e dramático.`,
          `Gere uma imagem com um efeito de "glitch" ou distorção digital para um apelo jovem e tecnológico.`,
          `Elabore uma imagem com um design gráfico abstrato no fundo, usando formas geométricas e cores vibrantes.`,
          `Crie uma cena conceitual e artística com o produto, usando iluminação cinematográfica e um ambiente surreal.`,
          `Desenvolva uma imagem do produto com um efeito de "dupla exposição", mesclando-o com uma textura ou paisagem relevante.`
      ]
  };

  const withTextPromises = prompts.withText.map(p => generateSingleImage(p, imagePart));
  const cleanPromises = prompts.clean.map(p => generateSingleImage(p, imagePart));
  const modernPromises = prompts.modern.map(p => generateSingleImage(p, imagePart));
  
  const [withTextResults, cleanResults, modernResults] = await Promise.all([
      Promise.allSettled(withTextPromises),
      Promise.allSettled(cleanPromises),
      Promise.allSettled(modernPromises)
  ]);
  
  return {
    withText: withTextResults.map(res => (res.status === 'fulfilled' ? res.value : null)).filter((v): v is string => v !== null),
    clean: cleanResults.map(res => (res.status === 'fulfilled' ? res.value : null)).filter((v): v is string => v !== null),
    modern: modernResults.map(res => (res.status === 'fulfilled' ? res.value : null)).filter((v): v is string => v !== null),
  };
};