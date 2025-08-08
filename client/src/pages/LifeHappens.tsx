import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Zap, Droplets, Wifi, DollarSign, MapPin, CreditCard } from "lucide-react";
import { Link } from "wouter";

interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function AccordionSection({ title, icon, children }: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between p-4 h-auto text-left bg-gray-50 hover:bg-gray-100"
        >
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-medium">{title}</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 p-4 bg-white border-l-4 border-red-600 rounded-r-lg shadow-sm">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function LifeHappens() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="bg-red-600 text-white py-12 text-center">
        <h1 className="text-4xl font-bold mb-2">Life Happens 🐾</h1>
        <p className="text-xl">All your Houston-area bills & backup plans, Cougar-style.</p>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        
        {/* Utility Payment Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-600" />
              Utility Payment Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Electricity, Gas, Water & Internet" 
              icon={<Droplets className="h-5 w-5 text-blue-600" />}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a 
                    href="https://www.reliant.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    <Zap className="h-4 w-4 text-yellow-600" />
                    <span>Reliant – Pay Electricity</span>
                  </a>
                  
                  <a 
                    href="https://www.centerpointenergy.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <Zap className="h-4 w-4 text-orange-600" />
                    <span>CenterPoint – Pay Gas</span>
                  </a>
                  
                  <a 
                    href="https://houstonwaterbills.houstontx.gov" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Droplets className="h-4 w-4 text-blue-600" />
                    <span>City of Houston – Water & Trash</span>
                  </a>
                  
                  <a 
                    href="https://www.xfinity.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <Wifi className="h-4 w-4 text-purple-600" />
                    <span>Xfinity – Internet Service</span>
                  </a>
                </div>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>

        {/* In-Person Payment Centers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-green-600" />
              In-Person Payment Centers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Find Local Stores for Cash Payments" 
              icon={<MapPin className="h-5 w-5 text-green-600" />}
            >
              <div className="space-y-4">
                <p className="text-gray-700">
                  Prefer to pay with cash? Visit your local H-E-B, Fiesta, or Kroger customer service counter.
                </p>
                <a 
                  href="https://www.paynearme.com/locations" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <MapPin className="h-4 w-4" />
                  Find a PayNearMe location
                </a>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>

        {/* Emergency Cash Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-red-600" />
              In a Pinch? Cougar Cash Lifeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Show Emergency Cash Options" 
              icon={<CreditCard className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2">Brigit</h4>
                    <p className="text-sm text-gray-700 mb-3">Get up to $250 instantly. No credit check.</p>
                    <Button variant="outline" size="sm" className="w-full border-red-300 text-red-700 hover:bg-red-100">
                      Apply Now
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Possible Finance</h4>
                    <p className="text-sm text-gray-700 mb-3">Low APR installment loans.</p>
                    <Button variant="outline" size="sm" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100">
                      Learn More
                    </Button>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Empower</h4>
                    <p className="text-sm text-gray-700 mb-3">Advance your paycheck.</p>
                    <Button variant="outline" size="sm" className="w-full border-green-300 text-green-700 hover:bg-green-100">
                      Get Started
                    </Button>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Cougar Tip:</strong> Only use emergency cash advances when absolutely necessary. 
                    Consider reaching out to UH Student Financial Services for additional support options.
                  </p>
                </div>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>

        {/* Quick Navigation to Life Solutions */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" size="sm" className="border-red-300 text-red-700 bg-red-50">
              💸 Life Happens (You're Here)
            </Button>
            <Link href="/life-solutions">
              <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                🛠️ Life Solutions
              </Button>
            </Link>
          </div>
        </div>

        {/* Additional Houston Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-6 w-6 text-purple-600" />
              Houston-Specific Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Local Houston Support & Services" 
              icon={<MapPin className="h-5 w-5 text-purple-600" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-1">Houston Food Bank</h4>
                  <p className="text-sm text-gray-600">Emergency food assistance</p>
                  <a href="https://www.houstonfoodbank.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                    Visit Website
                  </a>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-1">Harris County 211</h4>
                  <p className="text-sm text-gray-600">Community resources & assistance</p>
                  <p className="text-blue-600 text-sm">Call: 2-1-1</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-1">UH Student Financial Services</h4>
                  <p className="text-sm text-gray-600">Emergency financial aid for students</p>
                  <a href="https://uh.edu/financial" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                    Learn More
                  </a>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-1">METRO Transit</h4>
                  <p className="text-sm text-gray-600">Public transportation options</p>
                  <a href="https://www.ridemetro.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
                    Plan Your Trip
                  </a>
                </div>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}