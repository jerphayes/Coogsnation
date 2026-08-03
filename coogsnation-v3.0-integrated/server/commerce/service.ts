import { loadCommerceConfig, type CommerceConfig } from "./config";
import { LocalCatalogProvider } from "./providers/localCatalog";
import { ShopifyCommerceProvider } from "./providers/shopify";
import type { CommerceCapabilities, CommerceProduct, CommerceProvider } from "./types";

const SHOPPING_TERMS = /\b(shop|shopping|store|buy|purchase|merch|merchandise|hoodie|shirt|jersey|hat|gift|product|price|cart)\b/i;

export class CommerceService {
  readonly config: CommerceConfig;
  private readonly provider: CommerceProvider;

  constructor(config = loadCommerceConfig()) {
    this.config = config;
    this.provider = config.provider === "shopify"
      ? new ShopifyCommerceProvider(config)
      : new LocalCatalogProvider();
  }

  capabilities(): CommerceCapabilities {
    return this.provider.capabilities();
  }

  isShoppingIntent(message: string): boolean {
    return SHOPPING_TERMS.test(message);
  }

  async searchProducts(query: string, limit = this.config.searchLimit): Promise<CommerceProduct[]> {
    return this.provider.searchProducts(query, Math.max(1, Math.min(limit, this.config.searchLimit)));
  }

  async contextForAI(message: string): Promise<Array<{ question: string; answer: string }>> {
    if (!this.config.aiCatalogContextEnabled || !this.isShoppingIntent(message)) return [];
    try {
      const products = await this.searchProducts(message, 6);
      if (!products.length) return [];
      return [{
        question: "Current approved commerce catalog results",
        answer: JSON.stringify(products.map((product) => ({
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.priceAmount && product.currencyCode
            ? `${product.priceAmount} ${product.currencyCode}`
            : undefined,
          availableForSale: product.availableForSale,
          productUrl: product.productUrl,
          provider: product.provider,
        }))),
      }];
    } catch (error) {
      console.error("Commerce catalog context lookup failed:", error);
      return [];
    }
  }
}

let singleton: CommerceService | null = null;
export function getCommerceService(): CommerceService {
  if (!singleton) singleton = new CommerceService();
  return singleton;
}
