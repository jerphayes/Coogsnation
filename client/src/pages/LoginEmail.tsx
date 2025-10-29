import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import LoginComponent from "@/components/LoginComponent";

export default function LoginEmail() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <LoginComponent showTitle={true} defaultToLocal={true} />
        </div>
      </div>
      <Footer />
    </div>
  );
}
