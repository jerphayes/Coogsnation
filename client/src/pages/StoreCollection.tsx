import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StorefrontCatalog } from "@/components/store/StorefrontCatalog";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function StoreCollection({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Link href="/store"><Button variant="outline">← All Store Departments</Button></Link>
        </div>
        <StorefrontCatalog collection={slug} />
      </main>
      <Footer />
    </div>
  );
}
