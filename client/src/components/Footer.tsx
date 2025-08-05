import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-uh-black text-white py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-uh-red rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold">UH</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">CoogsNation</h3>
                <p className="text-gray-400 text-sm">Houston Cougar Community</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              The premier online community for University of Houston fans, students, alumni, and supporters.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-facebook text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-instagram text-xl"></i>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <i className="fab fa-youtube text-xl"></i>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/forums" className="text-gray-400 hover:text-white transition-colors">Forums</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Members</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Groups</a></li>
              <li><Link href="/events" className="text-gray-400 hover:text-white transition-colors">Events</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Rules</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Sports</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Football</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Basketball</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Baseball</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Recruiting</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Schedules</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/news" className="text-gray-400 hover:text-white transition-colors">News</Link></li>
              <li><Link href="/store" className="text-gray-400 hover:text-white transition-colors">Store</Link></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Alumni Network</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Support</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 CoogsNation.com. All rights reserved. Not affiliated with the University of Houston.
          </p>
          <p className="text-gray-400 text-sm mt-2 md:mt-0">
            Whose House? Coogs' House! 🐾
          </p>
        </div>
      </div>
    </footer>
  );
}
