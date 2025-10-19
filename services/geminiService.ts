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
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const contentGenerationModel = 'gemini-2.5-pro'; // Use Pro for complex JSON generation
// Switched to a model that supports image editing.
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

const generateSingleImage = async (prompt: string, image: File): Promise<string | null> => {
    try {
        const imagePart = await fileToGenerativePart(image);
        const textPart = { text: prompt };

        const response = await ai.models.generateContent({
            model: imageGenerationModel,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/jpeg';
                return `data:${mimeType};base64,${base64ImageBytes}`;
            }
        }
        return null;
    } catch (e) {
        console.error(`Failed to generate edited image for prompt "${prompt}"`, e);
        return null;
    }
};

export const generateProductImages = async (
  content: ProductContent,
  originalImage: File | null
): Promise<GeneratedImageSet> => {
  if (!content || !content.name) {
    console.warn("Cannot generate images without product content/name.");
    return { withText: [], clean: [], modern: [] };
  }

  if (!originalImage) {
      console.warn("Cannot generate edited images without an original uploaded image.");
      return { withText: [], clean: [], modern: [] };
  }

  const productName = content.name;
  const slogan = content.promotionalSlogan || "Oferta Especial";

  const prompts = {
      withText: [
        `Edit this product image into a professional marketing banner for "${productName}". Add the slogan "${slogan}" in a bold, eye-catching design. Use a clean background and studio lighting, keeping the product intact. Photorealistic, 8k.`,
        `Modify this image to be an advertisement for "${productName}". Elegantly integrate the slogan "${slogan}" into the composition. Give it a luxurious and modern feel, enhancing the original product.`,
        `Transform this image into a social media post for "${productName}". Overlay the text "${slogan}" with stylish typography and add vibrant colors, making the product pop.`,
        `Create an e-commerce hero image from this photo of "${productName}". The promotional text "${slogan}" must be clearly visible. Enhance the resolution and quality.`,
        `Recreate this image as a flat lay composition. The product "${productName}" should be the central element, with the slogan "${slogan}" written nearby in a beautiful script font.`,
      ],
      clean: [
        `Take this product image and place the product on a pure white background (#FFFFFF) with a subtle, soft shadow. Enhance it with professional studio lighting to make it hyper-realistic and 8k. Keep the product as the main focus.`,
        `Edit this image to place the product "${productName}" on a light gray gradient background, perfect for a product catalog. Ensure the final result is photorealistic.`,
        `Isolate the product "${productName}" from this image onto a minimalist background. Sharpen the focus on product details and texture for a high-detail macro shot.`,
        `Create a symmetrical, centered shot of the product "${productName}" from this image. Place it on a solid, neutral color background. Emulate professional e-commerce photography.`,
        `Make the product "${productName}" from this image appear to be floating on a clean, seamless white background. Apply perfect, even lighting for a minimalist and professional look.`,
      ],
      modern: [
        `Reimagine this product image as a lifestyle shot. Place the "${productName}" in a modern, stylish real-life environment. Apply cinematic lighting and a shallow depth of field, keeping the product clearly visible and in focus.`,
        `Turn this image of "${productName}" into a dynamic action shot. Use motion blur and interesting angles to create a sense of excitement and energy, without losing product detail.`,
        `Create a visually striking, conceptual image using this product "${productName}". Surround it with abstract geometric shapes and soft neon lighting, enhancing the original photo.`,
        `Place the product "${productName}" from this image into a realistic, relevant outdoor setting (e.g., a park for shoes, a beach for sunglasses). Give it beautiful natural lighting.`,
        `Transform this into a conceptual, artistic setting featuring "${productName}". Use creative elements like water ripples, smoke, or light trails to give the original image a premium feel.`
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