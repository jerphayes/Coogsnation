import type { Express } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { getCommerceService } from "./service";
import { createCommerceInquiry, recordCommerceClick } from "./tracking";

const storefrontQuerySchema = z.object({
  q: z.string().trim().max(300).optional(),
  collection: z.string().trim().max(120).regex(/^[a-z0-9-]+$/).optional(),
}).strict();

const clickSchema = z.object({
  productId: z.string().trim().min(1).max(260),
}).strict();

const inquirySchema = z.object({
  productId: z.string().trim().max(260).optional(),
  merchant: z.string().trim().max(160).optional(),
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  budgetRange: z.string().trim().max(80).optional(),
  message: z.string().trim().min(10).max(3000),
}).strict();

const commerceWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many commerce requests. Please try again later." },
});

export function registerCommerceRoutes(app: Express): void {
  const commerce = getCommerceService();

  app.get("/api/commerce/capabilities", (_req, res) => {
    res.json({ success: true, capabilities: commerce.capabilities() });
  });

  app.get("/api/commerce/storefront", async (req, res) => {
    try {
      const query = storefrontQuerySchema.parse({ q: req.query.q, collection: req.query.collection });
      res.json(await commerce.storefront({ query: query.q, collection: query.collection }));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid storefront request" });
      console.error("Commerce storefront failed:", error);
      return res.status(503).json({ message: "The merchandise catalog is temporarily unavailable" });
    }
  });

  app.get("/api/commerce/search", async (req, res) => {
    try {
      const query = z.string().trim().min(1).max(300).parse(req.query.q);
      const products = await commerce.listProducts({ query });
      res.json({ success: true, products });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid product search" });
      console.error("Commerce search failed:", error);
      return res.status(503).json({ message: "Product search is temporarily unavailable" });
    }
  });

  app.post("/api/commerce/events/click", commerceWriteLimiter, async (req: any, res) => {
    try {
      const { productId } = clickSchema.parse(req.body);
      const product = await commerce.productForTracking(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });
      await recordCommerceClick({
        userId: req.user?.id,
        siteKey: commerce.config.siteKey,
        schoolKey: commerce.config.schoolKey,
        product,
      });
      return res.status(202).json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid click event" });
      console.error("Commerce click tracking failed:", error);
      return res.status(202).json({ success: false });
    }
  });

  app.post("/api/commerce/inquiries", commerceWriteLimiter, async (req: any, res) => {
    try {
      const request = inquirySchema.parse(req.body);
      const inquiryId = await createCommerceInquiry({
        userId: req.user?.id,
        siteKey: commerce.config.siteKey,
        schoolKey: commerce.config.schoolKey,
        request,
      });
      return res.status(201).json({ success: true, inquiryId });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid inquiry", errors: error.errors });
      console.error("Commerce inquiry failed:", error);
      return res.status(500).json({ message: "Unable to save your inquiry" });
    }
  });
}
