
import { GoogleGenAI, Type, Modality, Part } from "@google/genai";
import { ProductContent, GeneratedImageSet } from '../types';

// Helper function to convert File to a base64-encoded string for the API
const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // The result includes the data URL prefix, so we remove it.
      // e.g., "data:image/jpeg;base64,LzlqLzRBQ..." -> "LzlqLzRBQ..."
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        resolve(''); 
      }
    };
    reader.readAsDataURL(file);
  });
  const base64EncodedData = await base64EncodedDataPromise;
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

// Initialize the Gemini client
// FIX: Initialize GoogleGenAI client with API key from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const contentGenerationModel = 'gemini-2.5-pro'; // Use Pro for complex JSON generation
const imageGenerationModel = 'gemini-2.5-flash-image';

const productSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'Creative and attractive product name, up to 120 characters.' },
    description: { type: Type.STRING, description: 'A detailed, persuasive, and SEO-friendly product description, using paragraphs and bullet points in Markdown format. Highlight key features and benefits.' },
    category: { type: Type.STRING, description: 'The most relevant product category, e.g., "Electronics > Headphones".' },
    brand: { type: Type.STRING, description: 'The product brand. If not available, leave empty.' },
    sku: { type: Type.STRING, description: 'A suggested unique SKU for the product.' },
    price: { type: Type.NUMBER, description: 'A competitive market price for the product in BRL.' },
    promotionalPrice: { type: Type.NUMBER, description: 'A suggested promotional price, slightly lower than the main price.' },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'A list of 10-15 relevant SEO keywords.'
    },
    variations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          color: { type: Type.STRING, description: "Color of the variation, e.g., 'Black'." },
          size: { type: Type.STRING, description: "Size of the variation, e.g., 'M'. Can be empty." },
          stock: { type: Type.INTEGER, description: 'A suggested initial stock number, e.g., 100.' },
          price: { type: Type.NUMBER, description: 'Price for this specific variation. Can be same as main price.' },
        },
        required: ['color', 'stock']
      },
      description: 'A list of possible product variations (e.g., different colors or sizes). Generate at least 2 if applicable.'
    },
    weight: { type: Type.NUMBER, description: 'Estimated product weight in kilograms (kg) for shipping.' },
    dimensions: { type: Type.STRING, description: 'Estimated package dimensions as a string "L x W x H cm" for shipping.' },
    promotionalSlogan: { type: Type.STRING, description: 'A short, catchy slogan (5-7 words) for marketing images.' }
  },
  required: ['name', 'description', 'category', 'price', 'keywords', 'variations', 'promotionalSlogan']
};

export const generateProductContent = async (
  image: File | null,
  title: string,
  url: string
): Promise<ProductContent> => {
  const promptParts: Part[] = [];

  let textPrompt = `You are a world-class e-commerce marketing expert. Your task is to generate comprehensive and persuasive product content based on the provided information. 
  
  **Instructions:**
  1. Analyze the product from the image, keywords, or link provided.
  2. Create compelling, SEO-friendly content that will drive sales.
  3. All monetary values should be in BRL (Brazilian Real).
  4. Generate the output in JSON format according to the provided schema.
  5. The product is for the Brazilian market, so all text should be in Brazilian Portuguese.
  
  **Product Information:**`;

  if (image) {
    const imagePart = await fileToGenerativePart(image);
    promptParts.push(imagePart);
    textPrompt += `\n- Product Image: [Provided]`;
  }
  if (title) {
    textPrompt += `\n- Keywords/Title: ${title}`;
  }
  if (url) {
    textPrompt += `\n- Product Link (for context): ${url}`;
  }

  if (!image && !title && !url) {
    throw new Error("Please provide an image, keywords, or a URL to generate content.");
  }
  
  promptParts.push({ text: textPrompt });

  try {
    const response = await ai.models.generateContent({
      model: contentGenerationModel,
      contents: [{ parts: promptParts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: productSchema,
        temperature: 0.5,
      },
    });

    const jsonText = response.text.trim();
    const generatedContent = JSON.parse(jsonText);
    
    const finalContent: ProductContent = {
        name: generatedContent.name || '',
        description: generatedContent.description || '',
        category: generatedContent.category || '',
        brand: generatedContent.brand,
        sku: generatedContent.sku,
        price: generatedContent.price || 0,
        promotionalPrice: generatedContent.promotionalPrice,
        keywords: generatedContent.keywords || [],
        variations: generatedContent.variations || [],
        weight: generatedContent.weight,
        dimensions: generatedContent.dimensions,
        promotionalSlogan: generatedContent.promotionalSlogan || '',
        generatedImages: [],
    };

    return finalContent;
  } catch (error) {
    console.error("Error generating product content:", error);
    throw new Error("Failed to generate product content. The model may have returned an invalid response. Please try again.");
  }
};

const generateSingleImage = async (prompt: string, image?: File | null): Promise<string | null> => {
    try {
        const contentParts: Part[] = [];
        if (image) {
            contentParts.push(await fileToGenerativePart(image));
        }
        contentParts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: imageGenerationModel,
            contents: { parts: contentParts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        // FIX: Safely access response candidates and parts to find image data.
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        return null;
    } catch (e) {
        console.error(`Failed to generate image for prompt "${prompt}"`, e);
        return null;
    }
};

export const generateProductImages = async (
  content: ProductContent,
  originalImage: File | null
): Promise<GeneratedImageSet> => {
  if (!originalImage) {
    return { withText: [], clean: [], modern: [] };
  }

  const slogan = content.promotionalSlogan || "Oferta Especial";

  const prompts = {
      withText: [
          `Add the text "${slogan}" to this product image in a stylish, modern, and prominent font. Integrate it naturally with the image composition.`,
          `Create a marketing banner from this image. Add the slogan "${slogan}" using a bold, eye-catching design.`,
          `Overlay the phrase "${slogan}" on this image. Use elegant typography that complements the product.`,
      ],
      clean: [
          'Remove the background from this product image and replace it with a clean, light gray gradient for a professional e-commerce look.',
          'Isolate the product from this image and place it on a pure white background. Add a subtle shadow to give it depth. This is for a product catalog.',
          'Re-render this product with studio lighting on a minimalist background. Keep it clean and focused on the product details.',
      ],
      modern: [
          'Place this product in a modern, real-life setting that matches its category, like a stylish home or outdoors. The lighting should be cinematic.',
          'Create a dynamic lifestyle shot of this product. Use motion blur and interesting angles to make it look exciting.',
          'Generate a visually striking image by adding abstract geometric shapes and neon lighting effects around this product.',
      ]
  };
  
  const withTextPromises = prompts.withText.map(p => generateSingleImage(p, originalImage));
  const cleanPromises = prompts.clean.map(p => generateSingleImage(p, originalImage));
  const modernPromises = prompts.modern.map(p => generateSingleImage(p, originalImage));

  const [withText, clean, modern] = await Promise.all([
    Promise.all(withTextPromises),
    Promise.all(cleanPromises),
    Promise.all(modernPromises),
  ]);

  return {
    withText: withText.map(img => img || ''),
    clean: clean.map(img => img || ''),
    modern: modern.map(img => img || ''),
  };
};
