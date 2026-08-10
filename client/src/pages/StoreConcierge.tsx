import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function StoreConcierge() {
  const { toast } = useToast();
  const productId = new URLSearchParams(window.location.search).get("product") || undefined;
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", budgetRange: "", message: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/commerce/inquiries", { ...form, productId });
      toast({ title: "Inquiry received", description: "CoogsNation can now follow up about the requested premium merchandise." });
      setForm({ name: "", email: "", phone: "", budgetRange: "", message: "" });
    } catch (error) {
      toast({ title: "Inquiry could not be saved", description: String(error), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="grid lg:grid-cols-2 gap-8 items-start">
          <div>
            <p className="text-uh-red font-bold uppercase tracking-wide">Premium Merchandise Concierge</p>
            <h1 className="text-4xl font-bold text-uh-black mt-2 mb-5">Class rings, jewelry, and custom fan-site collections</h1>
            <p className="text-lg text-gray-600 mb-6">
              Use this form for high-end officially licensed University of Houston merchandise, custom CoogsNation pieces, corporate gifts, commemorative jewelry, and future university fan-site collections.
            </p>
            <div className="space-y-4 text-gray-700">
              <p><strong>Official university marks:</strong> only products verified through an authorized licensed merchant may be published or sold.</p>
              <p><strong>CoogsNation originals:</strong> custom designs use CoogsNation-owned branding unless separate university-mark permission is documented.</p>
              <p><strong>Partner fulfillment:</strong> the final merchant, price, customization terms, warranties, returns, and delivery responsibility must be shown before purchase.</p>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Tell us what you are looking for</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <Input required minLength={2} maxLength={160} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input required type="email" maxLength={254} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Input maxLength={40} placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Select value={form.budgetRange} onValueChange={(budgetRange) => setForm({ ...form, budgetRange })}>
                  <SelectTrigger><SelectValue placeholder="Approximate budget (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under-250">Under $250</SelectItem>
                    <SelectItem value="250-750">$250–$750</SelectItem>
                    <SelectItem value="750-1500">$750–$1,500</SelectItem>
                    <SelectItem value="1500-5000">$1,500–$5,000</SelectItem>
                    <SelectItem value="5000-plus">$5,000+</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea required minLength={10} maxLength={3000} rows={7} placeholder="Describe the class ring, jewelry, customized item, quantity, occasion, and timing." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                <Button type="submit" className="w-full bg-uh-red hover:bg-red-700" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Merchandise Inquiry"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}
