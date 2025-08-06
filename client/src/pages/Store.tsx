import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { Product } from "@shared/schema";

export default function Store() {
  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-uh-black mb-2">Cougar Store</h1>
          <p className="text-gray-600">Official University of Houston merchandise and apparel</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded-t-lg"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img 
                    src={product.imageUrl || "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop"} 
                    alt={product.name}
                    className="w-full h-64 object-cover"
                  />
                  {(product.stockQuantity === 0 || product.stockQuantity === null) && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <Badge variant="destructive" className="text-lg">Out of Stock</Badge>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-uh-black line-clamp-2">{product.name}</h3>
                    {product.category && (
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                    )}
                  </div>
                  
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-uh-red">
                      ${product.price}
                    </span>
                    <Button 
                      className="bg-uh-red hover:bg-red-700 text-white"
                      disabled={product.stockQuantity === 0 || product.stockQuantity === null}
                    >
                      {(product.stockQuantity === 0 || product.stockQuantity === null) ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                  </div>
                  
                  {product.stockQuantity && product.stockQuantity > 0 && product.stockQuantity <= 10 && (
                    <p className="text-orange-600 text-xs mt-2">
                      Only {product.stockQuantity} left in stock!
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center text-gray-500">
              <i className="fas fa-shopping-bag text-6xl mb-6"></i>
              <h3 className="text-xl font-semibold mb-2">Store Coming Soon</h3>
              <p>We're working hard to bring you the best University of Houston merchandise!</p>
              <Button className="bg-uh-red hover:bg-red-700 text-white mt-4">
                Notify Me When Available
              </Button>
            </div>
          </Card>
        )}

        {/* Store Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 text-center">
            <div className="w-16 h-16 bg-uh-red rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-shipping-fast text-white text-2xl"></i>
            </div>
            <h3 className="font-semibold text-uh-black mb-2">Free Shipping</h3>
            <p className="text-gray-600 text-sm">Free shipping on orders over $50</p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="w-16 h-16 bg-uh-red rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-medal text-white text-2xl"></i>
            </div>
            <h3 className="font-semibold text-uh-black mb-2">Official Merchandise</h3>
            <p className="text-gray-600 text-sm">Authentic UH licensed products</p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="w-16 h-16 bg-uh-red rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-undo text-white text-2xl"></i>
            </div>
            <h3 className="font-semibold text-uh-black mb-2">Easy Returns</h3>
            <p className="text-gray-600 text-sm">30-day return policy</p>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
