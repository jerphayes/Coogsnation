import { storage } from "../../storage";

/**
 * Legacy/local database catalog adapter.
 *
 * This is intentionally standalone. The v3 storefront CommerceProvider
 * contract only represents "shopify" and "affiliate". Treating this local
 * database adapter as either provider would mislabel its source.
 */
export interface LocalCatalogCapabilities {
  provider: "local";
  configured: boolean;
  productSearch: boolean;
  productDetails: boolean;
  cartRead: boolean;
  cartMutation: boolean;
  checkoutUrl: boolean;
  note: string;
}

export interface LocalCatalogProduct {
  id: string;
  title: string;
  description: string;
  priceAmount: string;
  currencyCode: string;
  imageUrl?: string;
  productUrl: string;
  availableForSale: boolean;
  provider: "local";
}

export class LocalCatalogProvider {
  readonly name = "local" as const;

  capabilities(): LocalCatalogCapabilities {
    return {
      provider: this.name,
      configured: true,
      productSearch: true,
      productDetails: true,
      cartRead: false,
      cartMutation: false,
      checkoutUrl: false,
      note: "Local CoogsNation catalog is active. AI cart mutations remain disabled until explicit confirmation workflows are accepted.",
    };
  }

  async searchProducts(query: string, limit: number): Promise<LocalCatalogProduct[]> {
    const terms = query.toLowerCase().split(/\W+/).filter((term) => term.length > 2);
    const products = await storage.getProducts(100);
    const ranked = products.map((product) => {
      const haystack = `${product.name} ${product.description || ""} ${product.category || ""}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { product, score };
    }).filter(({ score }) => score > 0 || terms.length === 0)
      .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
      .slice(0, limit);

    return ranked.map(({ product }) => ({
      id: String(product.id),
      title: product.name,
      description: String(product.description || "").slice(0, 500),
      priceAmount: String(product.price || ""),
      currencyCode: "USD",
      imageUrl: product.imageUrl || undefined,
      productUrl: `/store/product/${product.id}`,
      availableForSale: Boolean(product.isActive) && Number(product.stockQuantity || 0) !== 0,
      provider: this.name,
    }));
  }
}
