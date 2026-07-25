import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

export function MerchandisePreview() {
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-3">
              <div className="w-16 h-16 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-uh-black mb-4 flex items-center">
        <i className="fas fa-shopping-bag text-uh-red mr-2"></i>
        Cougar Store
      </h3>
      <div className="space-y-4">
        {products && products.length > 0 ? (
          products.slice(0, 3).map((product: any) => (
            <div key={product.id} className="flex space-x-3">
              <img 
                src={product.imageUrl || "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=80&h=80&fit=crop"} 
                alt={product.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-uh-black">{product.name}</h4>
                <p className="text-xs text-gray-600 line-clamp-2">{product.description}</p>
                <p className="text-sm font-bold text-uh-red">${product.price}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <i className="fas fa-shopping-bag text-2xl mb-2"></i>
            <p>Store coming soon!</p>
          </div>
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <Link href="/store" className="text-uh-red hover:text-uh-black font-medium text-sm">
          Visit Store
        </Link>
      </div>
    </Card>
  );
}
