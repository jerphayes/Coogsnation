import type {
  CommerceProviderCapability,
  CommerceProviderName,
  StorefrontProduct,
} from "@shared/commerce";

export type CommerceProviderFilter = {
  siteKey: string;
  schoolKey: string;
  query?: string;
  collection?: string;
  limit: number;
};

export interface InternalCommerceProduct extends StorefrontProduct {
  destinationUrl?: string;
}

export interface CommerceProvider {
  readonly name: CommerceProviderName;
  capabilities(): CommerceProviderCapability;
  listProducts(filter: CommerceProviderFilter): Promise<InternalCommerceProduct[]>;
}
