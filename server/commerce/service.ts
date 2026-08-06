import { loadCommerceConfig, type CommerceConfig } from "./config";
import { STOREFRONT_COLLECTIONS } from "./collections";
import { AffiliateCatalogProvider } from "./providers/affiliateCatalog";
import { ShopifyCommerceProvider } from "./providers/shopify";
import type { StorefrontProduct, StorefrontResponse } from "@shared/commerce";
import type { CommerceProvider, CommerceProviderFilter, InternalCommerceProduct } from "./types";

const SHOPPING_TERMS = /\b(shop|shopping|store|buy|purchase|merch|merchandise|hoodie|shirt|jersey|hat|gift|product|price|jewelry|ring|pendant|watch|class ring)\b/i;

export class CommerceService {
  readonly config: CommerceConfig;
  private readonly providers: CommerceProvider[];

  constructor(config = loadCommerceConfig()) {
    this.config = config;
    this.providers = [
      new ShopifyCommerceProvider(config),
      new AffiliateCatalogProvider(config),
    ];
  }

  capabilities() {
    return this.providers.map((provider) => provider.capabilities());
  }

  isShoppingIntent(message: string): boolean {
    return SHOPPING_TERMS.test(message);
  }

  async listProducts(options: { query?: string; collection?: string; limit?: number } = {}): Promise<StorefrontProduct[]> {
    const filter: CommerceProviderFilter = {
      siteKey: this.config.siteKey,
      schoolKey: this.config.schoolKey,
      query: options.query,
      collection: options.collection,
      limit: Math.max(1, Math.min(options.limit || this.config.searchLimit, this.config.searchLimit)),
    };

    const results = await Promise.allSettled(this.providers.map((provider) => provider.listProducts(filter)));
    const products: InternalCommerceProduct[] = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") products.push(...result.value);
      else console.error(`[COMMERCE] ${this.providers[index].name} catalog failed:`, result.reason);
    });

    return products
      .filter((product) => product.licenseStatus !== "pending_verification")
      .sort((a, b) => Number(b.highValue) - Number(a.highValue) || a.title.localeCompare(b.title))
      .slice(0, filter.limit)
      .map(({ destinationUrl: _destinationUrl, ...product }) => product);
  }

  async storefront(options: { query?: string; collection?: string } = {}): Promise<StorefrontResponse> {
    const products = await this.listProducts(options);
    const notices: string[] = [];
    if (!this.capabilities().some((capability) => capability.configured)) {
      notices.push("Product providers are not configured yet. The storefront structure is ready for approved Shopify and affiliate catalogs.");
    }
    notices.push("University-branded products must be verified as officially licensed before publication.");
    notices.push("Affiliate products are sold and fulfilled by the named partner merchant; CoogsNation may earn a commission.");

    return {
      site: {
        siteKey: this.config.siteKey,
        schoolKey: this.config.schoolKey,
        name: this.config.siteName,
        schoolName: this.config.schoolName,
        currencyCode: this.config.currencyCode,
      },
      collections: STOREFRONT_COLLECTIONS,
      products,
      notices,
    };
  }

  async productForTracking(productId: string): Promise<StorefrontProduct | undefined> {
    const products = await this.listProducts({ limit: this.config.searchLimit });
    return products.find((product) => product.id === productId);
  }

  async contextForAI(message: string): Promise<Array<{ question: string; answer: string }>> {
    if (!this.config.aiCatalogContextEnabled || !this.isShoppingIntent(message)) return [];
    try {
      const products = await this.listProducts({ query: message, limit: 6 });
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
          merchant: product.merchant,
          purchaseMode: product.purchaseMode,
          officiallyLicensed: product.officiallyLicensed,
          actionUrl: product.actionUrl,
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
