import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface PODProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  category: string;
  type?: string;
  provider: string;
}

interface PODResponse {
  category: string;
  products: PODProduct[];
  error?: string;
  note?: string;
}

export default function EverydayAlumni() {
  const { user, isAuthenticated } = useAuth();
  const [selectedSort, setSelectedSort] = useState<string>("name");
  const { toast } = useToast();

  // Fetch Everyday Alumni products from Teelaunch
  const { data: podResponse, isLoading, error } = useQuery<PODResponse>({
    queryKey: ["/api/store/everyday-alumni"],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => {
      const numericId = parseInt(productId);
      if (isNaN(numericId)) {
        throw new Error("Invalid product ID for cart");
      }
      return apiRequest("/api/cart", "POST", { productId: numericId, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add to cart", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const products = podResponse?.products || [];
  const sortedProducts = products.sort((a, b) => {
    switch (selectedSort) {
      case "price-low":
        return (a.price || 0) - (b.price || 0);
      case "price-high":
        return (b.price || 0) - (a.price || 0);
      case "type":
        return (a.type || "").localeCompare(b.type || "");
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const handleAddToCart = (product: PODProduct) => {
    if (!isAuthenticated) {
      toast({ title: "Please log in to add items to cart", variant: "destructive" });
      return;
    }
    addToCartMutation.mutate({ productId: product.id, quantity: 1 });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-uh-black mb-2" data-testid="heading-everyday-alumni">
                Everyday Alumni
              </h1>
              <p className="text-lg text-gray-600 mb-4">
                Premium drinkware and engraved items by Teelaunch
              </p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <i className="fas fa-coffee mr-2 text-uh-red"></i>
                  Premium Mugs & Tumblers
                </span>
                <span className="flex items-center">
                  <i className="fas fa-award mr-2 text-uh-red"></i>
                  Engraved Plaques
                </span>
                <span className="flex items-center">
                  <i className="fas fa-glass-whiskey mr-2 text-uh-red"></i>
                  Custom Drinkware
                </span>
              </div>
            </div>
            {isAuthenticated && (
              <Link href="/cart">
                <Button className="bg-uh-red hover:bg-red-700" data-testid="button-view-cart">
                  <i className="fas fa-shopping-cart mr-2"></i>
                  View Cart
                </Button>
              </Link>
            )}
          </div>

          {/* Sort Controls */}
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={selectedSort}
                  onChange={(e) => setSelectedSort(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  data-testid="select-sort"
                >
                  <option value="name">Name</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="type">Product Type</option>
                </select>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Badge variant="outline" className="mr-2">
                  <i className="fas fa-tools mr-1"></i>
                  Teelaunch
                </Badge>
                {!isLoading && (
                  <span data-testid="text-product-count">
                    {products.length} products available
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-8">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <i className="fas fa-exclamation-triangle text-4xl text-red-400"></i>
              </div>
              <h3 className="text-xl font-bold mb-2 text-red-600">Unable to Load Products</h3>
              <p className="text-gray-600 mb-4">
                We're having trouble connecting to our drinkware provider. Please try again later.
              </p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/store/everyday-alumni"] })}
                variant="outline"
                data-testid="button-retry"
              >
                <i className="fas fa-redo mr-2"></i>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* API Error from Backend */}
        {podResponse?.error && (
          <Card className="mb-8 border-yellow-200">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <i className="fas fa-info-circle text-4xl text-yellow-400"></i>
              </div>
              <h3 className="text-lg font-bold mb-2 text-yellow-600">Service Notice</h3>
              <p className="text-gray-600" data-testid="text-service-notice">
                {podResponse.note || podResponse.error}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <Skeleton className="h-48 rounded-t-lg" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 mb-2" />
                  <Skeleton className="h-3 mb-2" />
                  <Skeleton className="h-6 mb-3" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && sortedProducts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow duration-200" data-testid={`card-product-${product.id}`}>
                <div className="relative">
                  <img
                    src={product.image || "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop"}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                    data-testid={`img-product-${product.id}`}
                  />
                  <Badge className="absolute top-2 right-2 bg-uh-red text-white">
                    {product.type || "Drinkware"}
                  </Badge>
                  <Badge 
                    variant="secondary"
                    className="absolute top-2 left-2 bg-green-100 text-green-700"
                  >
                    <i className="fas fa-tools mr-1 text-xs"></i>
                    Teelaunch
                  </Badge>
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg text-uh-black mb-2 line-clamp-2" data-testid={`text-product-name-${product.id}`}>
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2" data-testid={`text-product-description-${product.id}`}>
                    {product.description || "Premium University of Houston drinkware"}
                  </p>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-uh-red" data-testid={`text-product-price-${product.id}`}>
                      ${product.price?.toFixed(2) || "19.99"}
                    </span>
                    <span className="text-sm text-green-600 font-medium">
                      <i className="fas fa-check-circle mr-1"></i>
                      In Stock
                    </span>
                  </div>
                  
                  <Button
                    className="w-full bg-uh-red hover:bg-red-700"
                    onClick={() => handleAddToCart(product)}
                    disabled={addToCartMutation.isPending}
                    data-testid={`button-add-to-cart-${product.id}`}
                  >
                    {addToCartMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Adding...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-cart-plus mr-2"></i>
                        Add to Cart
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && sortedProducts.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <i className="fas fa-coffee text-4xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">No Products Available</h3>
              <p className="text-gray-600 mb-6">
                We're currently updating our Everyday Alumni collection. Check back soon for new arrivals!
              </p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/store/everyday-alumni"] })}
                variant="outline"
              >
                <i className="fas fa-redo mr-2"></i>
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Category Information */}
        <div className="mt-12 bg-white p-6 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <i className="fas fa-star text-3xl text-uh-red mb-3"></i>
              <h3 className="font-bold text-uh-black mb-2">Premium Materials</h3>
              <p className="text-gray-600">High-quality ceramics and stainless steel</p>
            </div>
            <div>
              <i className="fas fa-hammer text-3xl text-uh-red mb-3"></i>
              <h3 className="font-bold text-uh-black mb-2">Custom Engraving</h3>
              <p className="text-gray-600">Personalized University of Houston branding</p>
            </div>
            <div>
              <i className="fas fa-heart text-3xl text-uh-red mb-3"></i>
              <h3 className="font-bold text-uh-black mb-2">Daily Use</h3>
              <p className="text-gray-600">Perfect for your everyday routine</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <div className="flex justify-center space-x-4">
            <Link href="/store">
              <Button variant="outline">
                <i className="fas fa-store mr-2"></i>
                All Categories
              </Button>
            </Link>
            <Link href="/store/wear-your-pride">
              <Button variant="outline">
                <i className="fas fa-tshirt mr-2"></i>
                Wear Your Pride
              </Button>
            </Link>
            <Link href="/store/keepsakes-gifts">
              <Button variant="outline">
                <i className="fas fa-gem mr-2"></i>
                Keepsakes & Gifts
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}