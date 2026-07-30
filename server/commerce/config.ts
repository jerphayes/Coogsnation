import type { CommerceProviderName } from "./types";

export interface CommerceConfig {
  provider: CommerceProviderName;
  shopifyDomain?: string;
  shopifyStorefrontAccessToken?: string;
  shopifyApiVersion: string;
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

function validShopifyDomain(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!normalized) return undefined;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(normalized)) {
    throw new Error("SHOPIFY_STORE_DOMAIN must be a valid *.myshopify.com hostname");
  }
  return normalized;
}

export function loadCommerceConfig(): CommerceConfig {
  const provider = (process.env.COMMERCE_PROVIDER || "local").toLowerCase() === "shopify" ? "shopify" : "local";
  const apiVersion = (process.env.SHOPIFY_STOREFRONT_API_VERSION || "2026-07").trim();
  if (!/^20\d{2}-(01|04|07|10)$/.test(apiVersion)) {
    throw new Error("SHOPIFY_STOREFRONT_API_VERSION must use YYYY-01, YYYY-04, YYYY-07, or YYYY-10");
  }
  return {
    provider,
    shopifyDomain: validShopifyDomain(process.env.SHOPIFY_STORE_DOMAIN),
    shopifyStorefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim() || undefined,
    shopifyApiVersion: apiVersion,
    searchLimit: parseInteger(process.env.COMMERCE_SEARCH_LIMIT, 8, 1, 20),
    aiCatalogContextEnabled: parseBoolean(process.env.AI_COMMERCE_CATALOG_CONTEXT_ENABLED, true),
  };
}
