import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import type { CommerceConfig } from "../config";
import type { CommerceProvider, CommerceProviderFilter, InternalCommerceProduct } from "../types";

const affiliateItemSchema = z.object({
  id: z.string().trim().min(1).max(160),
  siteKeys: z.array(z.string().trim().min(1)).default(["coogsnation"]),
  schoolKeys: z.array(z.string().trim().min(1)).default(["houston"]),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(1200).default(""),
  merchant: z.string().trim().min(1).max(160),
  collection: z.string().trim().min(1).max(120),
  categories: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
  imageUrl: z.string().url().optional(),
  productUrl: z.string().url(),
  priceAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  currencyCode: z.string().length(3).default("USD"),
  licenseStatus: z.enum(["officially_licensed", "coogsnation_original", "pending_verification"]),
  highValue: z.boolean().default(false),
  purchaseMode: z.enum(["affiliate_redirect", "inquiry"]).default("affiliate_redirect"),
  ctaLabel: z.string().trim().max(80).optional(),
  disclosure: z.string().trim().max(500).optional(),
  active: z.boolean().default(true),
});

const catalogSchema = z.array(affiliateItemSchema);
type AffiliateItem = z.infer<typeof affiliateItemSchema>;

export class AffiliateCatalogProvider implements CommerceProvider {
  readonly name = "affiliate" as const;
  private catalogPromise: Promise<AffiliateItem[]> | null = null;

  constructor(private readonly config: CommerceConfig) {}

  capabilities() {
    const configured = Boolean(this.config.affiliateCatalogFile || this.config.affiliateCatalogJson);
    return {
      provider: this.name,
      configured,
      productDiscovery: configured,
      directCheckout: false,
      affiliateRedirect: configured,
      inquiries: true,
      note: configured
        ? "The vetted affiliate catalog is active. Transactions occur with the named partner merchant."
        : "Set AFFILIATE_CATALOG_FILE or AFFILIATE_CATALOG_JSON to activate vetted partner products.",
    };
  }

  private loadCatalog(): Promise<AffiliateItem[]> {
    if (this.catalogPromise) return this.catalogPromise;
    this.catalogPromise = (async () => {
      if (this.config.affiliateCatalogJson) {
        return catalogSchema.parse(JSON.parse(this.config.affiliateCatalogJson));
      }
      if (this.config.affiliateCatalogFile) {
        const raw = await readFile(resolve(process.cwd(), this.config.affiliateCatalogFile), "utf8");
        return catalogSchema.parse(JSON.parse(raw));
      }
      return [];
    })();
    return this.catalogPromise;
  }

  async listProducts(filter: CommerceProviderFilter): Promise<InternalCommerceProduct[]> {
    const catalog = await this.loadCatalog();
    const query = filter.query?.trim().toLowerCase();

    return catalog.filter((item) => {
      if (!item.active || item.licenseStatus === "pending_verification") return false;
      if (!item.siteKeys.includes(filter.siteKey) || !item.schoolKeys.includes(filter.schoolKey)) return false;
      if (filter.collection && item.collection !== filter.collection) return false;
      if (!query) return true;
      const haystack = [item.title, item.description, item.merchant, item.collection, ...item.categories, ...item.tags]
        .join(" ").toLowerCase();
      return query.split(/\s+/).every((term) => haystack.includes(term));
    }).slice(0, filter.limit).map((item): InternalCommerceProduct => ({
      id: `affiliate:${item.id}`,
      sourceId: item.id,
      siteKey: filter.siteKey,
      schoolKey: filter.schoolKey,
      title: item.title,
      description: item.description,
      provider: this.name,
      purchaseMode: item.purchaseMode,
      licenseStatus: item.licenseStatus,
      officiallyLicensed: item.licenseStatus === "officially_licensed",
      merchant: item.merchant,
      collection: item.collection,
      categories: item.categories,
      tags: item.tags,
      imageUrl: item.imageUrl,
      priceAmount: item.priceAmount,
      currencyCode: item.currencyCode,
      availableForSale: true,
      highValue: item.highValue,
      actionUrl: item.purchaseMode === "inquiry"
        ? `/store/concierge?product=${encodeURIComponent(`affiliate:${item.id}`)}`
        : item.productUrl,
      ctaLabel: item.ctaLabel || (item.purchaseMode === "inquiry" ? "Request Information" : `Shop at ${item.merchant}`),
      disclosure: item.disclosure || `Sold and fulfilled by ${item.merchant}. CoogsNation may earn a commission.`,
      destinationUrl: item.productUrl,
    }));
  }
}
