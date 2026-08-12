import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StoreProductCard } from "./StoreProductCard";
import type { StorefrontResponse } from "@shared/commerce";

export function StorefrontCatalog({ collection }: { collection?: string }) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const endpoint = collection
    ? `/api/commerce/storefront?collection=${encodeURIComponent(collection)}`
    : "/api/commerce/storefront";
  const { data, isLoading, error } = useQuery<StorefrontResponse>({ queryKey: [endpoint] });

  const activeCollection = data?.collections.find((item) => item.slug === collection);
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.products || []).filter((product) => {
      if (source !== "all" && product.provider !== source) return false;
      if (!term) return true;
      return [product.title, product.description, product.merchant, ...product.categories, ...product.tags]
        .join(" ").toLowerCase().includes(term);
    });
  }, [data?.products, search, source]);

  return (
    <>
      <section className="rounded-2xl bg-gradient-to-r from-gray-950 via-red-950 to-uh-red text-white p-8 md:p-12 mb-8">
        <Badge className="bg-white text-uh-red mb-4">Provider-Neutral Marketplace</Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          {activeCollection?.name || "CoogsNation Marketplace"}
        </h1>
        <p className="text-lg md:text-xl text-red-50 max-w-4xl">
          {activeCollection?.description || "Officially licensed university merchandise, CoogsNation originals, premium custom pieces, and vetted affiliate partners in one storefront."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="bg-white/10 rounded-full px-4 py-2">Shopify direct products</span>
          <span className="bg-white/10 rounded-full px-4 py-2">Licensed affiliate merchandise</span>
          <span className="bg-white/10 rounded-full px-4 py-2">Jewelry and class-ring inquiries</span>
        </div>
      </section>

      {!collection && (
        <section className="mb-10">
          <div className="flex justify-between items-end mb-5">
            <div>
              <h2 className="text-3xl font-bold text-uh-black">Shop by Department</h2>
              <p className="text-gray-600">The familiar store structure, now powered by approved commerce providers.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(data?.collections || []).map((item) => (
              <Link key={item.slug} href={`/store/${item.slug}`}>
                <Card className="h-full cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <CardContent className="p-6 flex gap-4 items-start">
                    <div className="w-14 h-14 rounded-full bg-red-50 text-uh-red flex items-center justify-center flex-none">
                      <i className={`${item.icon} text-2xl`} aria-hidden="true"></i>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-xl text-uh-black">{item.name}</h3>
                        {item.highValue && <Badge variant="outline">Premium</Badge>}
                      </div>
                      <p className="text-gray-600 mt-2">{item.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search approved products</label>
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search apparel, gifts, jewelry, rings..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seller type</label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All approved sellers</SelectItem>
                <SelectItem value="shopify">Direct Shopify products</SelectItem>
                <SelectItem value="affiliate">Affiliate partners</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => { setSearch(""); setSource("all"); }}>Clear</Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[520px] bg-gray-200 animate-pulse rounded-xl" />)}
          </div>
        ) : error ? (
          <Card><CardContent className="p-8 text-center text-red-700">The merchandise catalog could not be loaded.</CardContent></Card>
        ) : filteredProducts.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => <StoreProductCard key={product.id} product={product} />)}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <i className="fas fa-store text-5xl text-gray-400 mb-5" aria-hidden="true"></i>
              <h3 className="text-2xl font-bold text-uh-black mb-2">Approved catalog connection ready</h3>
              <p className="text-gray-600 max-w-3xl mx-auto">
                No products are published in this view yet. Shopify products require the approval and licensing tags, and affiliate products require a vetted partner catalog. No fake prices, inventory, or unverified merchandise will be displayed.
              </p>
              {activeCollection?.highValue && (
                <Link href="/store/concierge">
                  <Button className="mt-6 bg-uh-red hover:bg-red-700">Request Jewelry or Class-Ring Information</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="mt-8 space-y-2 text-xs text-gray-500">
        {(data?.notices || []).map((notice) => <p key={notice}>• {notice}</p>)}
      </section>
    </>
  );
}
