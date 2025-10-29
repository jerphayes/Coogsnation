import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, Smartphone, Headphones } from "lucide-react";

export default function LiveSports() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Radio className="w-8 h-8 text-uh-red" />
            <h1 className="text-4xl font-bold text-uh-black">Listen to Houston Cougars Sports</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Catch Houston Cougars games on KPRC 950 AM or through the Varsity Network app.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Varsity Network App */}
          <Card className="p-6 text-center">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 bg-uh-red rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-uh-black">Varsity Network App</h3>
              <p className="text-gray-600">Official app for college sports streaming</p>
              
              <div className="space-y-3">
                <a 
                  href="https://apps.apple.com/us/app/varsity-network/id1574519982" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  data-testid="link-varsity-ios"
                >
                  <Button className="w-full bg-black hover:bg-gray-800 text-white">
                    Download for iOS
                  </Button>
                </a>
                <a 
                  href="https://play.google.com/store/apps/details?id=com.sidearmsports.varsitynetwork.audio" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  data-testid="link-varsity-android"
                >
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    Get on Google Play
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Houston Cougars Official App */}
          <Card className="p-6 text-center">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 bg-uh-red rounded-full flex items-center justify-center mx-auto">
                <Headphones className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-uh-black">Houston Cougars Official App</h3>
              <p className="text-gray-600">The official UH Athletics app</p>
              
              <div className="space-y-3">
                <a 
                  href="https://apps.apple.com/us/app/houston-cougars/id1633712600" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  data-testid="link-uh-ios"
                >
                  <Button className="w-full bg-black hover:bg-gray-800 text-white">
                    Download for iOS
                  </Button>
                </a>
                <a 
                  href="https://play.google.com/store/apps/details?id=com.sidearmsports.houston" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  data-testid="link-uh-android"
                >
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    Get on Google Play
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* KPRC 950 AM Radio */}
          <Card className="p-6 text-center">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 bg-uh-red rounded-full flex items-center justify-center mx-auto">
                <Radio className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-uh-black">KPRC 950 AM Radio</h3>
              <p className="text-gray-600">Listen on your favorite radio platform</p>
              
              <div className="space-y-3">
                <a 
                  href="https://kprcradio.iheart.com/apps/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  data-testid="link-iheart"
                >
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                    Listen on iHeartRadio
                  </Button>
                </a>
                <a 
                  href="https://tunein.com/radio/KPRC-950-s34719/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  data-testid="link-tunein"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Listen on TuneIn
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-uh-black mb-4 text-center">Why Listen Live?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-uh-red mb-2">🏈 Never Miss a Game</h3>
              <p className="text-gray-600">Stay connected to Houston Cougars football, basketball, and other sports with live radio coverage and streaming options.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-uh-red mb-2">📱 Listen Anywhere</h3>
              <p className="text-gray-600">Take the game with you on mobile apps, web players, and traditional radio broadcasts wherever you go.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}