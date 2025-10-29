import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

interface LimitedEditionCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  comingSoon: boolean;
  route: string;
}

const limitedEditionCategories: LimitedEditionCategory[] = [
  {
    id: "native-jewelry",
    name: "Native Jewelry",
    description: "Authentic Native American-inspired jewelry and accessories",
    icon: "fas fa-feather-alt",
    comingSoon: true,
    route: "/store/limited-editions/native-jewelry"
  },
  {
    id: "neo-western-boots",
    name: "Neo-Western Boots", 
    description: "Modern western-style boots with University of Houston flair",
    icon: "fas fa-hiking",
    comingSoon: true,
    route: "/store/limited-editions/neo-western-boots"
  },
  {
    id: "navajo-blanket-series",
    name: "Navajo Blanket Series",
    description: "Traditional Navajo-pattern blankets and textiles",
    icon: "fas fa-mountain",
    comingSoon: true,
    route: "/store/limited-editions/navajo-blanket-series"
  },
  {
    id: "legacy-rings",
    name: "Legacy Rings & Pendants",
    description: "Premium class rings and commemorative pendants",
    icon: "fas fa-ring",
    comingSoon: true,
    route: "/store/limited-editions/legacy-rings"
  },
  {
    id: "alumni-artifacts",
    name: "Alumni Artifacts",
    description: "Vintage-inspired collectibles and memorabilia",
    icon: "fas fa-chess-rook",
    comingSoon: true,
    route: "/store/limited-editions/alumni-artifacts"
  }
];

export default function LimitedEditions() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-uh-black mb-4" data-testid="heading-limited-editions">
            Limited Editions
          </h1>
          <p className="text-xl text-gray-600 mb-6 max-w-3xl mx-auto">
            Exclusive collections coming soon to the CoogsNation Alumni Store. 
            Each category will feature unique, limited-quantity items celebrating University of Houston heritage.
          </p>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <i className="fas fa-clock mr-2"></i>
            Coming Soon
          </Badge>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {limitedEditionCategories.map((category) => (
            <Card 
              key={category.id} 
              className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
              onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              data-testid={`card-category-${category.id}`}
            >
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-uh-red bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className={`${category.icon} text-3xl text-uh-red`}></i>
                  </div>
                  <h3 className="text-2xl font-bold text-uh-black mb-3" data-testid={`text-category-name-${category.id}`}>
                    {category.name}
                  </h3>
                  <p className="text-gray-600 leading-relaxed" data-testid={`text-category-description-${category.id}`}>
                    {category.description}
                  </p>
                </div>

                {category.comingSoon && (
                  <Badge className="bg-yellow-100 text-yellow-700 mb-4">
                    <i className="fas fa-hourglass-half mr-1"></i>
                    Coming Soon
                  </Badge>
                )}

                <Link href={category.route}>
                  <Button 
                    variant="outline" 
                    className="w-full border-uh-red text-uh-red hover:bg-uh-red hover:text-white transition-colors"
                    disabled={category.comingSoon}
                    data-testid={`button-view-category-${category.id}`}
                  >
                    {category.comingSoon ? (
                      <>
                        <i className="fas fa-bell mr-2"></i>
                        Notify Me
                      </>
                    ) : (
                      <>
                        <i className="fas fa-arrow-right mr-2"></i>
                        View Collection
                      </>
                    )}
                  </Button>
                </Link>

                {/* Expanded Details */}
                {selectedCategory === category.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="text-left space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-star mr-2 text-uh-red"></i>
                        Limited quantity releases
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-certificate mr-2 text-uh-red"></i>
                        Premium materials and craftsmanship
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-university mr-2 text-uh-red"></i>
                        University of Houston heritage themes
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-clock mr-2 text-uh-red"></i>
                        Expected launch: Spring 2025
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Call to Action Section */}
        <div className="bg-gradient-to-r from-uh-red to-red-700 rounded-2xl p-8 text-center text-white mb-12">
          <h2 className="text-3xl font-bold mb-4">Be the First to Know</h2>
          <p className="text-xl mb-6 opacity-90">
            Sign up for notifications when Limited Edition collections launch
          </p>
          <div className="max-w-md mx-auto flex gap-4">
            <input 
              type="email" 
              placeholder="Enter your email address"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900"
              data-testid="input-email-notify"
            />
            <Button 
              className="bg-white text-uh-red hover:bg-gray-100 px-6"
              data-testid="button-notify-me"
            >
              <i className="fas fa-bell mr-2"></i>
              Notify Me
            </Button>
          </div>
        </div>

        {/* Available Categories */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-uh-black mb-6">Shop Available Categories</h2>
          <p className="text-gray-600 mb-8">
            While you wait for Limited Editions, explore our current product collections
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Link href="/store/wear-your-pride">
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <i className="fas fa-tshirt text-3xl text-uh-red mb-4"></i>
                  <h3 className="font-bold text-uh-black mb-2">Wear Your Pride</h3>
                  <p className="text-gray-600 text-sm">Premium apparel by Printful</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/store/everyday-alumni">
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <i className="fas fa-coffee text-3xl text-uh-red mb-4"></i>
                  <h3 className="font-bold text-uh-black mb-2">Everyday Alumni</h3>
                  <p className="text-gray-600 text-sm">Drinkware & engraved items by Teelaunch</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/store/keepsakes-gifts">
              <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <i className="fas fa-gem text-3xl text-uh-red mb-4"></i>
                  <h3 className="font-bold text-uh-black mb-2">Keepsakes & Gifts</h3>
                  <p className="text-gray-600 text-sm">Premium jewelry by Trendsi</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Back to Store */}
        <div className="text-center">
          <Link href="/store">
            <Button variant="outline" size="lg">
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Main Store
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}