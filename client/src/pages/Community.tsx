import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";

export default function Community() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-uh-red to-red-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-uh-red bg-white px-8 py-4 rounded-lg inline-block shadow-lg">
            CoogsNation Community
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-uh-red bg-white px-6 py-3 rounded-lg inline-block font-medium shadow-md">
            Connect, Share, and Grow with Fellow Houston Cougars
          </p>
        </div>
      </div>

      {/* Community Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Coog Paws Chat */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-paw text-2xl text-uh-red"></i>
              </div>
              <h3 className="text-xl font-bold text-uh-black mb-3">🐾 Coog Paws Chat</h3>
              <p className="text-gray-600 mb-6">Real-time chat for meaningful connections in the Cougar community</p>
              <Link href="/coogpaws-chat">
                <Button className="w-full bg-white text-uh-red border-2 border-uh-red hover:bg-red-50">
                  Join Coog Paws Chat
                </Button>
              </Link>
            </div>
          </div>

          {/* Water Cooler Talk */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-coffee text-2xl text-blue-600"></i>
              </div>
              <h3 className="text-xl font-bold text-uh-black mb-3">Water Cooler Talk</h3>
              <p className="text-gray-600 mb-6">Casual conversations and general discussions about campus life</p>
              <Link href="/forums/categories/23">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Start Chatting
                </Button>
              </Link>
            </div>
          </div>

          {/* Life Happens */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-wallet text-2xl text-green-600"></i>
              </div>
              <h3 className="text-xl font-bold text-uh-black mb-3">Life Happens</h3>
              <p className="text-gray-600 mb-6">Get help managing bills, payments, and financial challenges</p>
              <Link href="/life-happens">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Get Support
                </Button>
              </Link>
            </div>
          </div>

          {/* Life Solutions */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-tools text-2xl text-purple-600"></i>
              </div>
              <h3 className="text-xl font-bold text-uh-black mb-3">Life Solutions</h3>
              <p className="text-gray-600 mb-6">Houston resources, support services, and practical life guidance</p>
              <Link href="/life-solutions">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Explore Resources
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Additional Community Features */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-uh-black mb-12">
            More Ways to Connect
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <i className="fas fa-users text-4xl text-uh-red mb-4"></i>
              <h3 className="text-xl font-bold mb-4">Study Groups</h3>
              <p className="text-gray-600 mb-6">Form study groups with classmates and share academic resources</p>
              <Link href="/forums">
                <Button variant="outline" className="border-uh-red text-uh-red hover:bg-uh-red hover:text-white">
                  Find Study Partners
                </Button>
              </Link>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <i className="fas fa-calendar-alt text-4xl text-uh-red mb-4"></i>
              <h3 className="text-xl font-bold mb-4">Campus Events</h3>
              <p className="text-gray-600 mb-6">Stay updated on campus events, meetups, and social gatherings</p>
              <Link href="/forums/categories/campus-events">
                <Button variant="outline" className="border-uh-red text-uh-red hover:bg-uh-red hover:text-white">
                  View Events
                </Button>
              </Link>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <i className="fas fa-graduation-cap text-4xl text-uh-red mb-4"></i>
              <h3 className="text-xl font-bold mb-4">Alumni Network</h3>
              <p className="text-gray-600 mb-6">Connect with UH alumni and build professional relationships</p>
              <Link href="/forums/categories/22">
                <Button variant="outline" className="border-uh-red text-uh-red hover:bg-uh-red hover:text-white">
                  Network
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}