import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Cart() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardContent className="p-10 text-center">
            <i className="fas fa-shopping-bag text-5xl text-uh-red mb-5" aria-hidden="true"></i>
            <h1 className="text-3xl font-bold text-uh-black mb-4">Secure merchant checkout</h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-6">
              Direct products are completed through Shopify checkout. Affiliate merchandise is purchased from the named authorized partner. These product types are intentionally not mixed into one homemade cart.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/store"><Button className="bg-uh-red hover:bg-red-700">Return to Store</Button></Link>
              <Link href="/store/concierge"><Button variant="outline">Premium Merchandise Inquiry</Button></Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
