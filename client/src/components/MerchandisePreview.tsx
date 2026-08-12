import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import type { StorefrontResponse } from "@shared/commerce";
import { Link } from "wouter";

export function MerchandisePreview() {
  const { data, isLoading } = useQuery<StorefrontResponse>({
    queryKey: ["/api/commerce/storefront"],
  });
  const products = data?.products || [];

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-200 rounded" />)}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-uh-black mb-4 flex items-center">
        <i className="fas fa-shopping-bag text-uh-red mr-2"></i>
        CoogsNation Marketplace
      </h3>
      <div className="space-y-4">
        {products.length ? products.slice(0, 3).map((product) => (
          <div key={product.id} className="flex space-x-3">
            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-none">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" /> : <i className="fas fa-shopping-bag text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-uh-black truncate">{product.title}</h4>
              <p className="text-xs text-gray-600 line-clamp-2">{product.merchant}</p>
              <p className="text-xs font-bold text-uh-red">{product.officiallyLicensed ? "Officially Licensed" : "CoogsNation Original"}</p>
            </div>
          </div>
        )) : (
          <div className="text-center py-4 text-gray-500">
            <i className="fas fa-store text-2xl mb-2"></i>
            <p>Approved catalog connection ready</p>
          </div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <Link href="/store" className="text-uh-red hover:text-uh-black font-medium text-sm">Visit Marketplace</Link>
      </div>
    </Card>
  );
}
