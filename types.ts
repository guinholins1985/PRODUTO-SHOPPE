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
}

/**
 * Represents the 5 distinct, edited images generated from the user's original photo.
 * Each property corresponds to a specific editing style.
 */
export interface GeneratedImageSet {
  remastered: string | null;
  studio: string | null;
  lifestyle: string | null;
  infographic: string | null;
  dramatic: string | null;
}