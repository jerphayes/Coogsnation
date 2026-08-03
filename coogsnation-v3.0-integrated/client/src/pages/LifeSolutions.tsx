import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Home, Car, Heart, GraduationCap, Briefcase, Shield, Phone, Users } from "lucide-react";
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

export default function LifeSolutions() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="bg-red-600 text-white py-12 text-center">
        <h1 className="text-4xl font-bold mb-2">Life Solutions 🛠️</h1>
        <p className="text-xl">Smart solutions for Houston Cougars navigating life's challenges.</p>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        
        {/* Quick Navigation */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/life-happens">
              <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50">
                💸 Life Happens (Bills & Payments)
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 bg-blue-50">
              🛠️ Life Solutions (You're Here)
            </Button>
          </div>
        </div>

        {/* Housing Solutions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-6 w-6 text-blue-600" />
              Housing & Living Solutions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Finding Affordable Housing in Houston" 
              icon={<Home className="h-5 w-5 text-blue-600" />}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Student Housing</h4>
                    <ul className="text-sm space-y-1">
                      <li>• UH On-Campus Housing</li>
                      <li>• Cougar Village apartments</li>
                      <li>• Private student housing near campus</li>
                    </ul>
                    <a href="https://housing.uh.edu" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline block mt-2">
                      UH Housing Resources
                    </a>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Affordable Options</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Shared housing/roommate matching</li>
                      <li>• Income-based apartments</li>
                      <li>• First-time renter programs</li>
                    </ul>
                    <a href="https://www.apartments.com/houston-tx" target="_blank" rel="noopener noreferrer" className="text-green-600 text-sm hover:underline block mt-2">
                      Search Apartments
                    </a>
                  </div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">Cougar Housing Tips</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Budget 30% of income for rent</li>
                    <li>• Consider METRO proximity for easy campus access</li>
                    <li>• Join UH housing Facebook groups for roommate matching</li>
                    <li>• Apply early for on-campus housing (priority deadlines)</li>
                  </ul>
                </div>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>

        {/* Transportation Solutions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-6 w-6 text-green-600" />
              Transportation & Getting Around
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Houston Transportation Options" 
              icon={<Car className="h-5 w-5 text-green-600" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">METRO Transit</h4>
                  <p className="text-sm text-gray-700 mb-2">Free for UH students with Cougar Card</p>
                  <ul className="text-sm space-y-1">
                    <li>• Red Line connects to downtown</li>
                    <li>• Multiple bus routes serve campus</li>
                    <li>• Park & Ride locations</li>
                  </ul>
                  <a href="https://www.ridemetro.org" target="_blank" rel="noopener noreferrer" className="text-green-600 text-sm hover:underline block mt-2">
                    Plan Your Trip
                  </a>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Ride Sharing</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Uber/Lyft campus pickup zones</li>
                    <li>• Student discounts available</li>
                    <li>• Carpool groups via social media</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Campus Transportation</h4>
                  <ul className="text-sm space-y-1">
                    <li>• UH shuttle services</li>
                    <li>• Bike rental programs</li>
                    <li>• Walking paths and safety escorts</li>
                  </ul>
                  <a href="https://uh.edu/parking" target="_blank" rel="noopener noreferrer" className="text-purple-600 text-sm hover:underline block mt-2">
                    UH Transportation
                  </a>
                </div>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>

        {/* Health & Wellness Solutions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-red-500" />
              Health & Wellness Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Healthcare & Mental Health Support" 
              icon={<Heart className="h-5 w-5 text-red-500" />}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">UH Health Services</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Student Health Center</li>
                      <li>• Counseling and Psychological Services</li>
                      <li>• Wellness programming</li>
                      <li>• Crisis intervention</li>
                    </ul>
                    <a href="https://uh.edu/caps" target="_blank" rel="noopener noreferrer" className="text-red-600 text-sm hover:underline block mt-2">
                      UH CAPS Services
                    </a>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Community Health</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Harris Health System (low-cost care)</li>
                      <li>• Community health centers</li>
                      <li>• Pharmacy discount programs</li>
                      <li>• Mental health hotlines</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Crisis Resources</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>National Suicide Prevention:</strong> 988</p>
                      <p><strong>Crisis Text Line:</strong> Text HOME to 741741</p>
                    </div>
                    <div>
                      <p><strong>UH Crisis Line:</strong> 713-743-5454</p>
                      <p><strong>Harris County Crisis:</strong> 713-970-7000</p>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>

        {/* Academic & Career Solutions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-purple-600" />
              Academic & Career Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Student Success Resources" 
              icon={<GraduationCap className="h-5 w-5 text-purple-600" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-800 mb-2">Academic Support</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Learning and Assessment Services</li>
                    <li>• Tutoring and supplemental instruction</li>
                    <li>• Writing Center</li>
                    <li>• Library research assistance</li>
                  </ul>
                  <a href="https://uh.edu/usss" target="_blank" rel="noopener noreferrer" className="text-purple-600 text-sm hover:underline block mt-2">
                    UH Student Success
                  </a>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Career Development</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Career Services Center</li>
                    <li>• Internship programs</li>
                    <li>• Job search assistance</li>
                    <li>• Professional networking events</li>
                  </ul>
                  <a href="https://uh.edu/careers" target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline block mt-2">
                    UH Career Services
                  </a>
                </div>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>

        {/* Financial Solutions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-green-600" />
              Financial Planning & Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Smart Money Management for Cougars" 
              icon={<Briefcase className="h-5 w-5 text-green-600" />}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Budgeting Tools</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Mint (free budgeting app)</li>
                      <li>• YNAB (student discount)</li>
                      <li>• UH financial wellness workshops</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Student Banking</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Student checking accounts</li>
                      <li>• Credit union membership</li>
                      <li>• Building credit responsibly</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">Side Income</h4>
                    <ul className="text-sm space-y-1">
                      <li>• On-campus work study</li>
                      <li>• Freelancing opportunities</li>
                      <li>• Gig economy options</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-green-100 border border-green-300 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Cougar Money Tips</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Use student discounts everywhere (always ask!)</li>
                    <li>• Take advantage of free campus resources</li>
                    <li>• Cook meals instead of eating out frequently</li>
                    <li>• Buy/sell textbooks through student groups</li>
                    <li>• Use campus recreation instead of gym memberships</li>
                  </ul>
                </div>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>

        {/* Community Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-orange-600" />
              Community Support Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Building Your Houston Support System" 
              icon={<Users className="h-5 w-5 text-orange-600" />}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">Campus Connections</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Student organizations and clubs</li>
                    <li>• Greek life communities</li>
                    <li>• Religious and cultural groups</li>
                    <li>• Academic honor societies</li>
                  </ul>
                  <a href="https://uh.edu/dos" target="_blank" rel="noopener noreferrer" className="text-orange-600 text-sm hover:underline block mt-2">
                    UH Student Organizations
                  </a>
                </div>
                
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-red-800 mb-2">Houston Community</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Volunteer opportunities</li>
                    <li>• Professional associations</li>
                    <li>• Alumni networking groups</li>
                    <li>• Local meetup groups</li>
                  </ul>
                </div>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>

        {/* Emergency Preparedness */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-red-600" />
              Emergency Preparedness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AccordionSection 
              title="Houston Weather & Emergency Planning" 
              icon={<Shield className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">Hurricane Season</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Emergency supply kit (water, food, medicine)</li>
                      <li>• Important documents in waterproof container</li>
                      <li>• UH Alert emergency notifications</li>
                      <li>• Evacuation route planning</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Year-Round Safety</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Campus safety escort services</li>
                      <li>• Emergency contact information</li>
                      <li>• Personal safety apps</li>
                      <li>• Insurance documentation</li>
                    </ul>
                  </div>
                </div>
                
                <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">Emergency Contacts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>UH Police:</strong> 713-743-3333</p>
                      <p><strong>Emergency:</strong> 911</p>
                    </div>
                    <div>
                      <p><strong>Harris County Emergency:</strong> 713-881-3100</p>
                      <p><strong>UH Alert System:</strong> Sign up via AccessUH</p>
                    </div>
                  </div>
                </div>
              </div>
            </AccordionSection>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}