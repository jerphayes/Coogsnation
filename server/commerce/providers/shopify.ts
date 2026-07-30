import type { CommerceConfig } from "../config";
import type { CommerceCapabilities, CommerceProduct, CommerceProvider } from "../types";

const SEARCH_QUERY = `
query CoogsNationProductSearch($query: String!, $first: Int!) {
  products(first: $first, query: $query, sortKey: RELEVANCE) {
    nodes {
      id
      title
      description
      handle
      availableForSale
      featuredImage { url altText }
      priceRange { minVariantPrice { amount currencyCode } }
    }
  }
}`;

export class ShopifyCommerceProvider implements CommerceProvider {
  readonly name = "shopify" as const;

  constructor(private readonly config: CommerceConfig) {}

  private configured(): boolean {
    return Boolean(this.config.shopifyDomain && this.config.shopifyStorefrontAccessToken);
  }

  capabilities(): CommerceCapabilities {
    const configured = this.configured();
    return {
      provider: this.name,
      configured,
      productSearch: configured,
      productDetails: configured,
      cartRead: false,
      cartMutation: false,
      checkoutUrl: false,
      note: configured
        ? "Shopify Storefront product discovery is configured. Cart and checkout operations remain disabled until a separately accepted human-confirmation workflow is implemented."
        : "Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN to activate Shopify product discovery.",
    };
  }

  async searchProducts(query: string, limit: number): Promise<CommerceProduct[]> {
    if (!this.configured()) return [];
    const endpoint = `https://${this.config.shopifyDomain}/api/${this.config.shopifyApiVersion}/graphql.json`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": this.config.shopifyStorefrontAccessToken || "",
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: { query: query.slice(0, 500), first: Math.max(1, Math.min(limit, 20)) },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Shopify Storefront request failed with status ${response.status}`);
    const payload = await response.json() as any;
    if (payload.errors?.length) throw new Error("Shopify Storefront returned a GraphQL error");
    const nodes = payload.data?.products?.nodes || [];
    return nodes.map((product: any) => ({
      id: String(product.id),
      title: String(product.title || "Untitled product"),
      description: String(product.description || "").slice(0, 500),
      priceAmount: product.priceRange?.minVariantPrice?.amount,
      currencyCode: product.priceRange?.minVariantPrice?.currencyCode,
      imageUrl: product.featuredImage?.url,
      productUrl: `https://${this.config.shopifyDomain}/products/${product.handle}`,
      availableForSale: Boolean(product.availableForSale),
      provider: this.name,
    }));
  }
}
