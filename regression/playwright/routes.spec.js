const { test, expect } = require("@playwright/test");

const routes = ["/","/forums","/news","/store","/store/wear-your-pride","/store/everyday-alumni","/store/keepsakes-gifts","/store/limited-editions","/store/legacy-jewelry","/store/coogsnation-originals","/store/concierge","/events","/life-happens","/life-solutions","/community","/members","/terms","/login","/login/email","/reset-password","/login/other","/join/email","/signup","/join","/verify-email-pending","/verify-email","/live-sports","/get-em","/venues","/coogpaws-chat"];

for (const route of routes) {
 test("route " + route + " renders", async ({ page }) => {
 const errors = [];
 page.on("pageerror", e => errors.push(e.message));
 const response = await page.goto(route, { waitUntil: "domcontentloaded" });
 expect(response).not.toBeNull();
 expect(response.status()).toBeLessThan(500);
 await expect(page.locator("body")).toBeVisible();
 expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(0);
 expect(errors).toEqual([]);
 });
}
