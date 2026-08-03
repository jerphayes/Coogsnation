export type CommerceProviderName = "local" | "shopify";

export interface CommerceProduct {
  id: string;
  title: string;
  description: string;
  priceAmount?: string;
  currencyCode?: string;
  imageUrl?: string;
  productUrl?: string;
  availableForSale?: boolean;
  provider: CommerceProviderName;
}

export interface CommerceCapabilities {
  provider: CommerceProviderName;
  configured: boolean;
  productSearch: boolean;
  productDetails: boolean;
  cartRead: boolean;
  cartMutation: boolean;
  checkoutUrl: boolean;
  note: string;
}

export interface CommerceProvider {
  readonly name: CommerceProviderName;
  capabilities(): CommerceCapabilities;
  searchProducts(query: string, limit: number): Promise<CommerceProduct[]>;
}
