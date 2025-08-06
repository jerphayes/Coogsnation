import { db } from "./db";
import { 
  forumCategories, 
  hallOfFame, 
  products,
  newsArticles,
  events
} from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  // Seed forum categories with the requested new ones
  const categories = [
    {
      name: "Football",
      description: "Houston Cougar Football discussion, news, and analysis",
      slug: "football",
      icon: "fas fa-football-ball",
      color: "#DC2626",
      sortOrder: 1
    },
    {
      name: "Basketball",
      description: "Houston Cougar Basketball - Men's and Women's teams",
      slug: "basketball", 
      icon: "fas fa-basketball-ball",
      color: "#EA580C",
      sortOrder: 2
    },
    {
      name: "Baseball",
      description: "Houston Cougar Baseball discussion and updates",
      slug: "baseball",
      icon: "fas fa-baseball-ball", 
      color: "#16A34A",
      sortOrder: 3
    },
    {
      name: "Track & Field",
      description: "Houston Cougar Track & Field athletics",
      slug: "track-field",
      icon: "fas fa-running",
      color: "#7C3AED",
      sortOrder: 4
    },
    {
      name: "Golf",
      description: "Houston Cougar Golf team discussions",
      slug: "golf",
      icon: "fas fa-golf-ball",
      color: "#059669", 
      sortOrder: 5
    },
    {
      name: "Other Sports",
      description: "All other Houston Cougar athletics",
      slug: "other-sports",
      icon: "fas fa-trophy",
      color: "#0284C7",
      sortOrder: 6
    },
    {
      name: "Recruiting",
      description: "Houston Cougar recruiting news and discussions",
      slug: "recruiting",
      icon: "fas fa-search",
      color: "#DC2626",
      sortOrder: 7
    },
    {
      name: "Water Cooler Talk",
      description: "General discussions and off-topic conversations",
      slug: "water-cooler",
      icon: "fas fa-coffee",
      color: "#6B7280",
      sortOrder: 8
    },
    {
      name: "Heartbeats",
      description: "Dating, relationships, and meeting fellow Coogs",
      slug: "heartbeats",
      icon: "fas fa-heart",
      color: "#EC4899",
      sortOrder: 9
    },
    {
      name: "UH Hall of Fame",
      description: "Celebrating famous UH alumni, athletes, coaches, and faculty",
      slug: "hall-of-fame",
      icon: "fas fa-medal",
      color: "#DC2626",
      sortOrder: 10
    }
  ];

  console.log("📁 Seeding forum categories...");
  for (const category of categories) {
    await db.insert(forumCategories).values(category).onConflictDoNothing();
  }

  // Seed Hall of Fame entries
  const hallOfFameEntries = [
    {
      name: "Case Keenum",
      category: "athlete",
      description: "Former Houston Cougar quarterback who led the team to multiple successful seasons",
      achievements: "NFL quarterback, led UH to Conference USA championship, holder of multiple NCAA passing records",
      sport: "football",
      graduationYear: 2011,
      imageUrl: "https://images.unsplash.com/photo-1577223625816-7546f13df25d?w=400&h=400&fit=crop"
    },
    {
      name: "Hakeem Olajuwon",
      category: "athlete", 
      description: "Basketball legend and NBA Hall of Famer",
      achievements: "NBA Champion, NBA Finals MVP, NBA MVP, Basketball Hall of Fame inductee",
      sport: "basketball",
      graduationYear: 1984,
      imageUrl: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=400&fit=crop"
    },
    {
      name: "Tom Herman",
      category: "coach",
      description: "Former Houston Cougar football head coach",
      achievements: "Led UH to multiple bowl games and top 25 rankings, developed explosive offensive system",
      sport: "football",
      imageUrl: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=400&h=400&fit=crop"
    },
    {
      name: "Dr. Paula M. Short",
      category: "faculty",
      description: "Renowned education administrator and former UH College of Education dean",
      achievements: "Pioneer in educational leadership, published researcher, administrative excellence",
      department: "Education",
      imageUrl: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop"
    }
  ];

  console.log("🏆 Seeding Hall of Fame entries...");
  for (const entry of hallOfFameEntries) {
    await db.insert(hallOfFame).values(entry).onConflictDoNothing();
  }

  // Seed some sample products
  const sampleProducts = [
    {
      name: "CoogsNation Baseball Cap",
      description: "Official Houston Cougars baseball cap with embroidered logo",
      price: "29.99",
      category: "apparel",
      stockQuantity: 50,
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop"
    },
    {
      name: "UH Hoodie - Red",
      description: "Comfortable Houston Cougars hoodie in signature red",
      price: "49.99", 
      category: "apparel",
      stockQuantity: 30,
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop"
    },
    {
      name: "Cougar Pride T-Shirt",
      description: "Classic Houston Cougars t-shirt for every fan",
      price: "19.99",
      category: "apparel", 
      stockQuantity: 75,
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop"
    }
  ];

  console.log("🛍️ Seeding products...");
  for (const product of sampleProducts) {
    await db.insert(products).values(product).onConflictDoNothing();
  }

  console.log("✅ Database seeding completed!");
}

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };