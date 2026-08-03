import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { Product } from "@shared/schema";

export default function Store() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const { toast } = useToast();

  // Products query
  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      apiRequest("/api/cart", "POST", { productId, quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    },
  });

  const filteredProducts = products ? (products as Product[]).filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.isActive;
  }).sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return parseFloat(a.price) - parseFloat(b.price);
      case "price-high":
        return parseFloat(b.price) - parseFloat(a.price);
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  }) : [];

  const categories = products ? Array.from(new Set((products as Product[]).map(p => p.category))) : [];

  const handleAddToCart = (productId: number) => {
    if (!isAuthenticated) {
      toast({ title: "Please log in to add items to cart", variant: "destructive" });
      return;
    }
    addToCartMutation.mutate({ productId, quantity: 1 });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-uh-black">Coogs Nation Store</h1>
              <p className="text-gray-600 mt-2">
                Official University of Houston merchandise and fan gear
              </p>
            </div>
            {isAuthenticated && (
              <Link href="/cart">
                <Button className="bg-uh-red hover:bg-red-700">
                  <i className="fas fa-shopping-cart mr-2"></i>
                  View Cart
                </Button>
              </Link>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Products
              </label>
              <Input
                placeholder="Search by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category || ""}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSortBy("name");
                }}
              >
                <i className="fas fa-undo mr-2"></i>
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow duration-200">
                <div className="relative">
                  <img
                    src={product.imageUrl || "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=300&fit=crop"}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <Badge 
                    className="absolute top-2 right-2 bg-uh-red text-white"
                  >
                    {product.category}
                  </Badge>
                  {(product.stockQuantity || 0) <= 5 && (
                    <Badge 
                      variant="destructive"
                      className="absolute top-2 left-2"
                    >
                      Low Stock
                    </Badge>
                  )}
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg text-uh-black mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description || "No description available"}
                  </p>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-uh-red">
                      ${product.price}
                    </span>
                    <span className="text-sm text-gray-500">
                      {product.stockQuantity || 0} in stock
                    </span>
                  </div>
                  
                  <Button
                    className="w-full bg-uh-red hover:bg-red-700"
                    onClick={() => handleAddToCart(product.id)}
                    disabled={addToCartMutation.isPending || (product.stockQuantity || 0) === 0}
                  >
                    {addToCartMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Adding...
                      </>
                    ) : (product.stockQuantity || 0) === 0 ? (
                      "Out of Stock"
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
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="mb-4">
                <i className="fas fa-search text-4xl text-gray-400"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">No products found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || selectedCategory !== "all" 
                  ? "Try adjusting your search or filter criteria"
                  : "No products are currently available"}
              </p>
              {(searchQuery || selectedCategory !== "all") && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                >
                  <i className="fas fa-undo mr-2"></i>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Featured Categories */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-uh-black mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Card 
                key={category}
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => setSelectedCategory(category || "")}
              >
                <CardContent className="p-6 text-center">
                  <div className="mb-3">
                    <i className={`fas fa-${getCategoryIcon(category || "")} text-3xl text-uh-red`}></i>
                  </div>
                  <h3 className="font-bold text-uh-black">{category}</h3>
                  <p className="text-sm text-gray-600">
                    {(products as Product[])?.filter(p => p.category === category && p.isActive).length || 0} items
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Store Information */}
        <div className="mt-12 bg-white p-6 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <i className="fas fa-shipping-fast text-3xl text-uh-red mb-3"></i>
              <h3 className="font-bold text-uh-black mb-2">Free Shipping</h3>
              <p className="text-gray-600">On orders over $50</p>
            </div>
            <div>
              <i className="fas fa-undo text-3xl text-uh-red mb-3"></i>
              <h3 className="font-bold text-uh-black mb-2">Easy Returns</h3>
              <p className="text-gray-600">30-day return policy</p>
            </div>
            <div>
              <i className="fas fa-shield-alt text-3xl text-uh-red mb-3"></i>
              <h3 className="font-bold text-uh-black mb-2">Secure Checkout</h3>
              <p className="text-gray-600">Safe & secure payments</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const iconMap: { [key: string]: string } = {
    'Apparel': 'tshirt',
    'Accessories': 'hat-cowboy',
    'Electronics': 'laptop',
    'Home & Garden': 'home',
    'Sports': 'football-ball',
    'Books': 'book',
    'Collectibles': 'gem',
  };
  return iconMap[category] || 'tag';
}