import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import type { StorefrontProduct } from "@shared/commerce";

function priceLabel(product: StorefrontProduct): string {
  if (!product.priceAmount) return product.highValue ? "Pricing from partner" : "See product details";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: product.currencyCode || "USD",
    }).format(Number(product.priceAmount));
  } catch {
    return `${product.priceAmount} ${product.currencyCode || "USD"}`;
  }
}

async function recordClick(productId: string): Promise<void> {
  try {
    await fetch("/api/commerce/events/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      keepalive: true,
      body: JSON.stringify({ productId }),
    });
  } catch {
    // Revenue tracking must never block a customer from reaching the merchant.
  }
}

export function StoreProductCard({ product }: { product: StorefrontProduct }) {
  const external = product.actionUrl.startsWith("http");
  const action = (
    <Button className="w-full bg-uh-red hover:bg-red-700" disabled={!product.availableForSale}>
      {product.availableForSale ? product.ctaLabel : "Currently unavailable"}
    </Button>
  );

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-200" data-testid={`store-product-${product.id}`}>
      <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <i className={`${product.highValue ? "fas fa-gem" : "fas fa-shopping-bag"} text-5xl text-gray-400`} aria-hidden="true"></i>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {product.officiallyLicensed && <Badge className="bg-green-700">Officially Licensed</Badge>}
          {product.licenseStatus === "coogsnation_original" && <Badge className="bg-uh-red">CoogsNation Original</Badge>}
          {product.highValue && <Badge className="bg-gray-900">Premium</Badge>}
        </div>
      </div>

      <CardContent className="p-5 flex flex-col min-h-[310px]">
        <div className="mb-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">{product.merchant}</p>
          <h3 className="font-bold text-xl text-uh-black line-clamp-2">{product.title}</h3>
        </div>
        <p className="text-gray-600 text-sm line-clamp-3 flex-1">{product.description || "Product details are available from the merchant."}</p>
        <div className="my-4">
          <p className="font-bold text-lg text-uh-red">{priceLabel(product)}</p>
          <p className="text-xs text-gray-500 mt-1">{product.disclosure}</p>
        </div>

        {external ? (
          <a href={product.actionUrl} target="_blank" rel="noopener noreferrer sponsored" onClick={() => recordClick(product.id)}>
            {action}
          </a>
        ) : (
          <Link href={product.actionUrl} onClick={() => recordClick(product.id)}>
            {action}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
