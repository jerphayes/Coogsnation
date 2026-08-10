import { db } from "../db";
import { commerceClickEvents, commerceInquiries } from "@shared/schema";
import type { CommerceInquiryRequest, StorefrontProduct } from "@shared/commerce";

export async function recordCommerceClick(input: {
  userId?: string;
  siteKey: string;
  schoolKey: string;
  product: StorefrontProduct;
}): Promise<void> {
  let destinationHost: string | undefined;
  try {
    destinationHost = input.product.actionUrl.startsWith("http")
      ? new URL(input.product.actionUrl).hostname
      : undefined;
  } catch {
    destinationHost = undefined;
  }

  await db.insert(commerceClickEvents).values({
    userId: input.userId || null,
    siteKey: input.siteKey,
    schoolKey: input.schoolKey,
    provider: input.product.provider,
    productId: input.product.id,
    merchant: input.product.merchant,
    destinationHost: destinationHost || null,
    purchaseMode: input.product.purchaseMode,
  });
}

export async function createCommerceInquiry(input: {
  userId?: string;
  siteKey: string;
  schoolKey: string;
  request: CommerceInquiryRequest;
}): Promise<number> {
  const [created] = await db.insert(commerceInquiries).values({
    userId: input.userId || null,
    siteKey: input.siteKey,
    schoolKey: input.schoolKey,
    productId: input.request.productId || null,
    merchant: input.request.merchant || null,
    name: input.request.name,
    email: input.request.email,
    phone: input.request.phone || null,
    budgetRange: input.request.budgetRange || null,
    message: input.request.message,
    status: "new",
  }).returning({ id: commerceInquiries.id });
  return created.id;
}
