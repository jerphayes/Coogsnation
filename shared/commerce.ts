export type CommerceProviderName = "shopify" | "affiliate";
export type CommercePurchaseMode = "shopify_product" | "affiliate_redirect" | "inquiry";
export type CommerceLicenseStatus = "officially_licensed" | "coogsnation_original" | "pending_verification";

export interface StorefrontCollection {
  slug: string;
  name: string;
  description: string;
  icon: string;
  featured: boolean;
  highValue?: boolean;
}

export interface StorefrontProduct {
  id: string;
  sourceId: string;
  siteKey: string;
  schoolKey: string;
  title: string;
  description: string;
  provider: CommerceProviderName;
  purchaseMode: CommercePurchaseMode;
  licenseStatus: CommerceLicenseStatus;
  officiallyLicensed: boolean;
  merchant: string;
  collection: string;
  categories: string[];
  tags: string[];
  imageUrl?: string;
  priceAmount?: string;
  currencyCode?: string;
  compareAtPriceAmount?: string;
  availableForSale: boolean;
  highValue: boolean;
  actionUrl: string;
  ctaLabel: string;
  disclosure?: string;
}

export interface StorefrontResponse {
  site: {
    siteKey: string;
    schoolKey: string;
    name: string;
    schoolName: string;
    currencyCode: string;
  };
  collections: StorefrontCollection[];
  products: StorefrontProduct[];
  notices: string[];
}

export interface CommerceProviderCapability {
  provider: CommerceProviderName;
  configured: boolean;
  productDiscovery: boolean;
  directCheckout: boolean;
  affiliateRedirect: boolean;
  inquiries: boolean;
  note: string;
}

export interface CommerceInquiryRequest {
  productId?: string;
  merchant?: string;
  name: string;
  email: string;
  phone?: string;
  budgetRange?: string;
  message: string;
}
