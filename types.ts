export interface ProductVariation {
  color?: string;
  size?: string;
  stock?: number;
  price?: number;
}

export interface VideoScene {
  scene: string;
  description: string;
}

export interface VideoScript {
  title: string;
  scenes: VideoScene[];
}

export interface ProductContent {
  name: string;
  description: string;
  category: string;
  brand?: string;
  sku?: string;
  price: number;
  promotionalPrice?: number;
  keywords: string[];
  variations: ProductVariation[];
  weight?: number; // in kg
  dimensions?: string; // "L x W x H cm"
  promotionalSlogan?: string;
  generatedImages?: string[];
  imageTextSuggestions?: string[];
  imageTextPlacementSuggestions?: string;
  hashtags?: string[];
  coupon?: {
    code: string;
    phrase: string;
  };
  metaTitle?: string;
  metaDescription?: string;
  slug?: string;
  imageAltText?: string;
  socialMediaPost?: string;
  videoScript?: VideoScript;
}

/**
 * Represents the single AI-generated image for the product.
 */
export type GeneratedProductImage = string | null;

/**
 * Defines the AI services that can be configured in the admin panel.
 */
export type SupportedAIService = 'gemini'; // Can be extended, e.g., 'gemini' | 'openai' | 'anthropic'

/**
 * Defines the structure for storing multiple API keys.
 */
export type ApiKeySet = {
  [key in SupportedAIService]?: string;
};