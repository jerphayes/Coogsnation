import type { CommerceConfig } from "../config";
import type { CommerceProvider, CommerceProviderFilter, InternalCommerceProduct } from "../types";

const PRODUCTS_QUERY = `
query CoogsNationProducts($query: String!, $first: Int!) {
  products(first: $first, query: $query, sortKey: RELEVANCE) {
    nodes {
      id
      title
      description
      handle
      availableForSale
      productType
      vendor
      tags
      featuredImage { url altText }
      priceRange { minVariantPrice { amount currencyCode } }
    }
  }
}`;

function tagValue(tags: string[], prefix: string): string | undefined {
  const match = tags.find((tag) => tag.toLowerCase().startsWith(prefix.toLowerCase()));
  return match?.slice(prefix.length).trim();
}

function licenseStatus(tags: string[]): "officially_licensed" | "coogsnation_original" | "pending_verification" {
  const normalized = new Set(tags.map((tag) => tag.toLowerCase()));
  if (normalized.has("license:official") || normalized.has("officially-licensed")) return "officially_licensed";
  if (normalized.has("license:original") || normalized.has("coogsnation-original")) return "coogsnation_original";
  return "pending_verification";
}

export class ShopifyCommerceProvider implements CommerceProvider {
  readonly name = "shopify" as const;

  constructor(private readonly config: CommerceConfig) {}

  private configured(): boolean {
    return Boolean(this.config.shopifyDomain && this.config.shopifyStorefrontAccessToken);
  }

  capabilities() {
    const configured = this.configured();
    return {
      provider: this.name,
      configured,
      productDiscovery: configured,
      directCheckout: configured,
      affiliateRedirect: false,
      inquiries: false,
      note: configured
        ? "Approved Shopify products are available. Variant selection and checkout occur in the Shopify storefront until an embedded variant cart is activated."
        : "Set SHOPIFY_STORE_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN to activate direct products.",
    };
  }

  async listProducts(filter: CommerceProviderFilter): Promise<InternalCommerceProduct[]> {
    if (!this.configured()) return [];

    const clauses = [`tag:${this.config.shopifyRequiredTag}`];
    if (filter.query?.trim()) clauses.push(filter.query.trim().slice(0, 300));

    const endpoint = `https://${this.config.shopifyDomain}/api/${this.config.shopifyApiVersion}/graphql.json`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": this.config.shopifyStorefrontAccessToken || "",
      },
      body: JSON.stringify({
        query: PRODUCTS_QUERY,
        variables: { query: clauses.join(" "), first: Math.max(1, Math.min(filter.limit, 100)) },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) throw new Error(`Shopify Storefront request failed with status ${response.status}`);
    const payload = await response.json() as any;
    if (payload.errors?.length) throw new Error("Shopify Storefront returned a GraphQL error");

    const publicDomain = this.config.shopifyPublicStoreDomain || this.config.shopifyDomain;
    const nodes = payload.data?.products?.nodes || [];

    return nodes.map((product: any): InternalCommerceProduct => {
      const tags = Array.isArray(product.tags) ? product.tags.map(String) : [];
      const status = licenseStatus(tags);
      const collection = tagValue(tags, "collection:") || "wear-your-pride";
      const highValue = tags.some((tag) => ["high-value", "luxury", "class-ring", "fine-jewelry"].includes(tag.toLowerCase()));
      return {
        id: `shopify:${String(product.id)}`,
        sourceId: String(product.id),
        siteKey: filter.siteKey,
        schoolKey: filter.schoolKey,
        title: String(product.title || "Untitled product"),
        description: String(product.description || "").slice(0, 800),
        provider: this.name,
        purchaseMode: "shopify_product",
        licenseStatus: status,
        officiallyLicensed: status === "officially_licensed",
        merchant: String(product.vendor || this.config.siteName),
        collection,
        categories: [String(product.productType || collection)].filter(Boolean),
        tags,
        imageUrl: product.featuredImage?.url,
        priceAmount: product.priceRange?.minVariantPrice?.amount,
        currencyCode: product.priceRange?.minVariantPrice?.currencyCode || this.config.currencyCode,
        availableForSale: Boolean(product.availableForSale),
        highValue,
        actionUrl: `https://${publicDomain}/products/${product.handle}`,
        ctaLabel: highValue ? "View Details" : "Shop Direct",
        disclosure: `Sold and fulfilled through ${String(product.vendor || this.config.siteName)} using Shopify checkout.`,
        destinationUrl: `https://${publicDomain}/products/${product.handle}`,
      };
    }).filter((product: InternalCommerceProduct) =>
      product.licenseStatus !== "pending_verification" && (!filter.collection || product.collection === filter.collection),
    );
  }
}
