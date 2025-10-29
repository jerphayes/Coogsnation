import fetch from "node-fetch";

export interface PODProduct {
  id: string;
  name: string;
  description?: string;
  price?: number;
  image: string;
  category: string;
  type?: string;
  provider: 'printful' | 'teelaunch' | 'trendsi';
  originalData: any;
}

export interface PODServiceResponse {
  category: string;
  products: PODProduct[];
  success: boolean;
  error?: string;
}

/**
 * ==========================
 * PRINTFUL API SERVICE
 * ==========================
 * Handles Wear Your Pride - Apparel products
 */
export class PrintfulService {
  private static readonly BASE_URL = 'https://api.printful.com';
  private static readonly API_KEY = process.env.PRINTFUL_API_KEY;

  static async fetchWearYourPrideProducts(): Promise<PODServiceResponse> {
    try {
      console.log('[PRINTFUL] Fetching Wear Your Pride products...');
      
      if (!this.API_KEY) {
        console.warn('[PRINTFUL] API key not found, returning empty results');
        return {
          category: 'Wear Your Pride',
          products: [],
          success: false,
          error: 'Printful API key not configured'
        };
      }

      const response = await fetch(`${this.BASE_URL}/products`, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`Printful API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      
      if (!data.result || !Array.isArray(data.result)) {
        throw new Error('Invalid Printful API response format');
      }

      // Filter for apparel products (Wear Your Pride)
      const apparelProducts = data.result.filter((item: any) => 
        item.main_category === 'Apparel' || 
        ['Polo', 'Jacket', 'Hat', 'Shirt', 'Hoodie'].some(type => 
          item.type?.toLowerCase().includes(type.toLowerCase()) ||
          item.name?.toLowerCase().includes(type.toLowerCase())
        )
      );

      const products: PODProduct[] = apparelProducts.map((item: any) => ({
        id: item.id.toString(),
        name: item.name || 'Printful Product',
        description: item.description || `${item.type} from Printful`,
        price: this.extractPrice(item),
        image: item.thumbnail_url || item.image_url || '',
        category: 'Wear Your Pride',
        type: item.type || 'Apparel',
        provider: 'printful' as const,
        originalData: item,
      }));

      console.log(`[PRINTFUL] Successfully fetched ${products.length} Wear Your Pride products`);

      return {
        category: 'Wear Your Pride',
        products,
        success: true,
      };

    } catch (error: any) {
      console.error('[PRINTFUL] Error fetching products:', error.message);
      return {
        category: 'Wear Your Pride',
        products: [],
        success: false,
        error: error.message || 'Failed to fetch Printful products'
      };
    }
  }

  private static extractPrice(item: any): number {
    // Printful might have different price structures
    if (item.price) return parseFloat(item.price);
    if (item.retail_price) return parseFloat(item.retail_price);
    if (item.variants && item.variants[0]?.price) return parseFloat(item.variants[0].price);
    return 25.99; // Default price for Printful apparel
  }
}

/**
 * ==========================
 * TEELAUNCH API SERVICE
 * ==========================
 * Handles Everyday Alumni - Mugs, Tumblers, Engraved items
 */
export class TeelaunchService {
  private static readonly BASE_URL = 'https://api.teelaunch.com/v1';
  private static readonly API_KEY = process.env.TEELAUNCH_API_KEY;

  static async fetchEverydayAlumniProducts(): Promise<PODServiceResponse> {
    try {
      console.log('[TEELAUNCH] Fetching Everyday Alumni products...');
      
      if (!this.API_KEY) {
        console.warn('[TEELAUNCH] API key not found, returning empty results');
        return {
          category: 'Everyday Alumni',
          products: [],
          success: false,
          error: 'Teelaunch API key not configured'
        };
      }

      const response = await fetch(`${this.BASE_URL}/products`, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`Teelaunch API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      
      if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Invalid Teelaunch API response format');
      }

      // Filter for everyday items (mugs, tumblers, plaques)
      const everydayProducts = data.products.filter((item: any) =>
        ['Mug', 'Tumbler', 'Plaque', 'Cup', 'Bottle', 'Drinkware'].some(type =>
          item.category?.toLowerCase().includes(type.toLowerCase()) ||
          item.name?.toLowerCase().includes(type.toLowerCase())
        )
      );

      const products: PODProduct[] = everydayProducts.map((item: any) => ({
        id: item.id.toString(),
        name: item.name || 'Teelaunch Product',
        description: item.description || `${item.category} from Teelaunch`,
        price: this.extractPrice(item),
        image: item.image || item.thumbnail || '',
        category: 'Everyday Alumni',
        type: item.category || 'Drinkware',
        provider: 'teelaunch' as const,
        originalData: item,
      }));

      console.log(`[TEELAUNCH] Successfully fetched ${products.length} Everyday Alumni products`);

      return {
        category: 'Everyday Alumni',
        products,
        success: true,
      };

    } catch (error: any) {
      console.error('[TEELAUNCH] Error fetching products:', error.message);
      return {
        category: 'Everyday Alumni',
        products: [],
        success: false,
        error: error.message || 'Failed to fetch Teelaunch products'
      };
    }
  }

  private static extractPrice(item: any): number {
    if (item.price) return parseFloat(item.price);
    if (item.retail_price) return parseFloat(item.retail_price);
    return 19.99; // Default price for Teelaunch drinkware
  }
}

/**
 * ==========================
 * TRENDSI API SERVICE
 * ==========================
 * Handles Keepsakes & Gifts - Premium jewelry and accessories
 */
export class TrendsiService {
  private static readonly BASE_URL = 'https://api.trendsi.com/v1';
  private static readonly API_KEY = process.env.TRENDSI_API_KEY;

  static async fetchKeepsakesAndGiftsProducts(): Promise<PODServiceResponse> {
    try {
      console.log('[TRENDSI] Fetching Keepsakes & Gifts products...');
      
      if (!this.API_KEY) {
        console.warn('[TRENDSI] API key not found, returning empty results');
        return {
          category: 'Keepsakes & Gifts',
          products: [],
          success: false,
          error: 'Trendsi API key not configured'
        };
      }

      const response = await fetch(`${this.BASE_URL}/products`, {
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`Trendsi API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      
      if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Invalid Trendsi API response format');
      }

      // Filter for keepsakes and gifts (jewelry, accessories)
      const keepsakeProducts = data.products.filter((item: any) =>
        ['Jewelry', 'Bracelet', 'Necklace', 'Earrings', 'Ring', 'Pendant', 'Charm', 'Accessory'].some(type =>
          item.category?.toLowerCase().includes(type.toLowerCase()) ||
          item.name?.toLowerCase().includes(type.toLowerCase())
        )
      );

      const products: PODProduct[] = keepsakeProducts.map((item: any) => ({
        id: item.id.toString(),
        name: item.name || 'Trendsi Product',
        description: item.description || `${item.category} from Trendsi`,
        price: this.extractPrice(item),
        image: item.image || item.thumbnail || '',
        category: 'Keepsakes & Gifts',
        type: item.category || 'Jewelry',
        provider: 'trendsi' as const,
        originalData: item,
      }));

      console.log(`[TRENDSI] Successfully fetched ${products.length} Keepsakes & Gifts products`);

      return {
        category: 'Keepsakes & Gifts',
        products,
        success: true,
      };

    } catch (error: any) {
      console.error('[TRENDSI] Error fetching products:', error.message);
      return {
        category: 'Keepsakes & Gifts',
        products: [],
        success: false,
        error: error.message || 'Failed to fetch Trendsi products'
      };
    }
  }

  private static extractPrice(item: any): number {
    if (item.price) return parseFloat(item.price);
    if (item.retail_price) return parseFloat(item.retail_price);
    return 39.99; // Default price for Trendsi jewelry
  }
}

/**
 * ==========================
 * POD MANAGER SERVICE
 * ==========================
 * Centralized service to manage all POD providers
 */
export class PODManagerService {
  
  static async fetchAllCategories(): Promise<PODServiceResponse[]> {
    console.log('[POD MANAGER] Fetching products from all POD providers...');
    
    const results = await Promise.allSettled([
      PrintfulService.fetchWearYourPrideProducts(),
      TeelaunchService.fetchEverydayAlumniProducts(),
      TrendsiService.fetchKeepsakesAndGiftsProducts(),
    ]);

    return results.map((result, index) => {
      const categories = ['Wear Your Pride', 'Everyday Alumni', 'Keepsakes & Gifts'];
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`[POD MANAGER] Failed to fetch ${categories[index]} products:`, result.reason);
        return {
          category: categories[index],
          products: [],
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  static async fetchCategoryProducts(category: string): Promise<PODServiceResponse> {
    console.log(`[POD MANAGER] Fetching products for category: ${category}`);
    
    switch (category.toLowerCase()) {
      case 'wear-your-pride':
      case 'wear your pride':
        return PrintfulService.fetchWearYourPrideProducts();
        
      case 'everyday-alumni':  
      case 'everyday alumni':
        return TeelaunchService.fetchEverydayAlumniProducts();
        
      case 'keepsakes-gifts':
      case 'keepsakes & gifts':
      case 'keepsakes and gifts':
        return TrendsiService.fetchKeepsakesAndGiftsProducts();
        
      default:
        return {
          category,
          products: [],
          success: false,
          error: `Unknown category: ${category}`
        };
    }
  }

  // Placeholder functions for Limited Editions categories
  static async fetchLimitedEditionProducts(subcategory: string): Promise<PODServiceResponse> {
    const subcategories: { [key: string]: string } = {
      'native-jewelry': 'Limited Editions - Native Jewelry',
      'neo-western-boots': 'Limited Editions - Neo-Western Boots', 
      'navajo-blanket-series': 'Limited Editions - Navajo Blanket Series',
      'legacy-rings': 'Limited Editions - Legacy Rings & Pendants',
      'alumni-artifacts': 'Limited Editions - Alumni Artifacts'
    };

    const categoryName = subcategories[subcategory] || `Limited Editions - ${subcategory}`;

    console.log(`[POD MANAGER] Placeholder for ${categoryName}`);
    
    return {
      category: categoryName,
      products: [],
      success: true,
      error: 'Future supplier API integration pending'
    };
  }
}

// Export helper functions for error handling and validation
export const PODHelpers = {
  validateApiKeys(): { printful: boolean; teelaunch: boolean; trendsi: boolean } {
    return {
      printful: !!process.env.PRINTFUL_API_KEY,
      teelaunch: !!process.env.TEELAUNCH_API_KEY, 
      trendsi: !!process.env.TRENDSI_API_KEY,
    };
  },

  logApiStatus(): void {
    const keys = this.validateApiKeys();
    console.log('[POD CONFIG] API Keys Status:', {
      printful: keys.printful ? '✅' : '❌',
      teelaunch: keys.teelaunch ? '✅' : '❌',
      trendsi: keys.trendsi ? '✅' : '❌',
    });
  }
};