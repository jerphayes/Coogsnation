export interface CommerceConfig {
  siteKey: string;
  schoolKey: string;
  siteName: string;
  schoolName: string;
  currencyCode: string;
  shopifyDomain?: string;
  shopifyPublicStoreDomain?: string;
  shopifyStorefrontAccessToken?: string;
  shopifyApiVersion: string;
  shopifyRequiredTag: string;
  affiliateCatalogFile?: string;
  affiliateCatalogJson?: string;
  searchLimit: number;
  aiCatalogContextEnabled: boolean;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parseInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(parsed, maximum));
}

function validHostname(value: string | undefined, label: string): string | undefined {
  const normalized = value?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!normalized) return undefined;
  if (!/^[a-z0-9][a-z0-9.-]+$/.test(normalized)) {
    throw new Error(`${label} must be a valid hostname`);
  }
  return normalized;
}

export function loadCommerceConfig(): CommerceConfig {
  const apiVersion = (process.env.SHOPIFY_STOREFRONT_API_VERSION || "2026-07").trim();
  if (!/^20\d{2}-(01|04|07|10)$/.test(apiVersion)) {
    throw new Error("SHOPIFY_STOREFRONT_API_VERSION must use YYYY-01, YYYY-04, YYYY-07, or YYYY-10");
  }

  return {
    siteKey: (process.env.COMMERCE_SITE_KEY || "coogsnation").trim().toLowerCase(),
    schoolKey: (process.env.COMMERCE_SCHOOL_KEY || "houston").trim().toLowerCase(),
    siteName: (process.env.COMMERCE_SITE_NAME || "CoogsNation").trim(),
    schoolName: (process.env.COMMERCE_SCHOOL_NAME || "University of Houston").trim(),
    currencyCode: (process.env.COMMERCE_CURRENCY_CODE || "USD").trim().toUpperCase(),
    shopifyDomain: validHostname(process.env.SHOPIFY_STORE_DOMAIN, "SHOPIFY_STORE_DOMAIN"),
    shopifyPublicStoreDomain: validHostname(process.env.SHOPIFY_PUBLIC_STORE_DOMAIN, "SHOPIFY_PUBLIC_STORE_DOMAIN"),
    shopifyStorefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim() || undefined,
    shopifyApiVersion: apiVersion,
    shopifyRequiredTag: (process.env.SHOPIFY_REQUIRED_COMMERCE_TAG || "coogsnation-approved").trim(),
    affiliateCatalogFile: process.env.AFFILIATE_CATALOG_FILE?.trim() || undefined,
    affiliateCatalogJson: process.env.AFFILIATE_CATALOG_JSON?.trim() || undefined,
    searchLimit: parseInteger(process.env.COMMERCE_SEARCH_LIMIT, 48, 1, 100),
    aiCatalogContextEnabled: parseBoolean(process.env.AI_COMMERCE_CATALOG_CONTEXT_ENABLED, true),
  };
}
