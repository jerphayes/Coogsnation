import { Header } from "@/components/Header";

export default function TestAdmin() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Test Admin Dashboard</h1>
        <p>This is a simple test admin page to verify routing works.</p>
        <div className="mt-4">
          <a href="/admin" className="text-blue-600 hover:underline">Go to Full Admin Dashboard</a>
        </div>
      </div>
    </div>
  );
}