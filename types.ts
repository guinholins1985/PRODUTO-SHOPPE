export interface ProductVariation {
  color?: string;
  size?: string;
  stock?: number;
  price?: number;
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
}

/**
 * Represents the single AI-generated image for the product.
 */
export type GeneratedProductImage = string | null;