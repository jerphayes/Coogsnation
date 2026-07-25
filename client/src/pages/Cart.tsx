import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { ShoppingCart, Product } from "@shared/schema";

export default function Cart() {
  const { user, isAuthenticated } = useAuth();
  const [promoCode, setPromoCode] = useState("");
  const { toast } = useToast();

  // Cart items
  const { data: cartItems, isLoading: cartLoading } = useQuery({
    queryKey: ["/api/cart"],
    enabled: isAuthenticated,
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      apiRequest(`/api/cart/${itemId}`, "PUT", { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Cart updated successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to update cart", variant: "destructive" });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => apiRequest(`/api/cart/${itemId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Item removed from cart" });
    },
    onError: () => {
      toast({ title: "Failed to remove item", variant: "destructive" });
    },
  });

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: (data: { promoCode?: string }) =>
      apiRequest("/api/checkout", "POST", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Order placed successfully!" });
      // Redirect to order confirmation page  
      window.location.href = `/order-confirmation/${data.orderId}`;
    },
    onError: () => {
      toast({ title: "Checkout failed", variant: "destructive" });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Please log in to view your cart</h2>
            <p className="text-gray-600">You need to be logged in to access your shopping cart.</p>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const calculateSubtotal = () => {
    if (!cartItems) return 0;
    return (cartItems as any[]).reduce((total, item) => {
      return total + (parseFloat(item.product.price) * item.quantity);
    }, 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.0825; // 8.25% Texas sales tax
  };

  const calculateShipping = (subtotal: number) => {
    return subtotal > 50 ? 0 : 9.99;
  };

  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const shipping = calculateShipping(subtotal);
  const total = subtotal + tax + shipping;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-uh-black">Shopping Cart</h1>
          <p className="text-gray-600 mt-2">
            {cartItems ? `${(cartItems as any[]).length} item(s) in your cart` : 'Loading cart...'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {cartLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex space-x-4">
                        <div className="w-16 h-16 bg-gray-200 rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : cartItems && (cartItems as any[]).length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Cart Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {(cartItems as any[]).map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 pb-6 border-b last:border-b-0">
                        <img
                          src={item.product.imageUrl || "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=100&h=100&fit=crop"}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-uh-black">{item.product.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{item.product.description}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline">{item.product.category}</Badge>
                            <span className="text-sm text-gray-500">SKU: {item.product.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantityMutation.mutate({ 
                                itemId: item.id, 
                                quantity: Math.max(1, item.quantity - 1) 
                              })}
                              disabled={updateQuantityMutation.isPending}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value) || 1;
                                updateQuantityMutation.mutate({ 
                                  itemId: item.id, 
                                  quantity: newQuantity 
                                });
                              }}
                              className="w-16 text-center"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantityMutation.mutate({ 
                                itemId: item.id, 
                                quantity: item.quantity + 1 
                              })}
                              disabled={updateQuantityMutation.isPending}
                            >
                              +
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-uh-red">
                              ${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                              ${item.product.price} each
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItemMutation.mutate(item.id)}
                            disabled={removeItemMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="mb-4">
                    <i className="fas fa-shopping-cart text-4xl text-gray-400"></i>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Your cart is empty</h3>
                  <p className="text-gray-600 mb-6">Start shopping to add items to your cart</p>
                  <Link href="/store">
                    <Button className="bg-uh-red hover:bg-red-700">
                      <i className="fas fa-store mr-2"></i>
                      Browse Store
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (8.25%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-gray-500">
                    Free shipping on orders over $50
                  </p>
                )}
                
                <Separator />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-uh-red">${total.toFixed(2)}</span>
                </div>

                {/* Promo Code */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Promo Code</label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                    />
                    <Button variant="outline" size="sm">
                      Apply
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Checkout Button */}
                <Button
                  className="w-full bg-uh-red hover:bg-red-700"
                  size="lg"
                  onClick={() => checkoutMutation.mutate({ promoCode })}
                  disabled={!cartItems || (cartItems as any[]).length === 0 || checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-credit-card mr-2"></i>
                      Checkout
                    </>
                  )}
                </Button>

                <div className="text-xs text-gray-500 text-center mt-4">
                  <p>Secure checkout powered by Stripe</p>
                  <p>Your payment information is encrypted and secure</p>
                </div>
              </CardContent>
            </Card>

            {/* Continue Shopping */}
            <Card className="mt-6">
              <CardContent className="p-4">
                <Link href="/store">
                  <Button variant="outline" className="w-full">
                    <i className="fas fa-arrow-left mr-2"></i>
                    Continue Shopping
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Estimated Delivery */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">Estimated Delivery</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-gray-600">
                  <p className="flex items-center mb-2">
                    <i className="fas fa-truck text-uh-red mr-2"></i>
                    3-5 business days
                  </p>
                  <p className="text-xs">
                    Orders placed by 2 PM CST ship the same day
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}