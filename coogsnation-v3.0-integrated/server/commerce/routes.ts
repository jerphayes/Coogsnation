import type { Express } from "express";
import { z } from "zod";
import { getCommerceService } from "./service";

type Middleware = (req: any, res: any, next: any) => unknown;

export function registerCommerceRoutes(app: Express, isAuthenticated: Middleware): void {
  const commerce = getCommerceService();

  app.get("/api/commerce/capabilities", (_req, res) => {
    res.json({ success: true, capabilities: commerce.capabilities() });
  });

  app.get("/api/commerce/search", isAuthenticated, async (req, res) => {
    try {
      const query = z.string().trim().min(1).max(500).parse(req.query.q);
      const products = await commerce.searchProducts(query);
      res.json({ success: true, provider: commerce.capabilities().provider, products });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid product search" });
      console.error("Commerce search failed:", error);
      return res.status(503).json({ message: "Product search is temporarily unavailable" });
    }
  });
}
