import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ExternalLinkDisclaimer, useExternalLinkDisclaimer } from "@/components/ExternalLinkDisclaimer";
import { ChatWidget } from "@/components/ChatWidget";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/LandingSimple";
import Home from "@/pages/Home";
import Forums from "@/pages/Forums";
import News from "@/pages/News";
import Store from "@/pages/Store";
import Cart from "@/pages/Cart";
import Profile from "@/pages/Profile";
import WearYourPride from "@/pages/WearYourPride";
import EverydayAlumni from "@/pages/EverydayAlumni";
import KeepsakesGifts from "@/pages/KeepsakesGifts";
import LimitedEditions from "@/pages/LimitedEditions";
import Events from "@/pages/Events";
import ForumCategory from "@/pages/ForumCategory";
import ForumTopic from "@/pages/ForumTopic";
import NewsAdmin from "@/pages/NewsAdmin";
import AdvancedProfile from "@/pages/AdvancedProfile";
import Messages from "@/pages/Messages";
import EventManagement from "@/pages/EventManagement";
import EnhancedDashboard from "@/pages/EnhancedDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import TestAdmin from "@/pages/TestAdmin";
import SimpleAdminDashboard from "@/pages/SimpleAdminDashboard";
import LifeHappens from "@/pages/LifeHappens";
import LifeSolutions from "@/pages/LifeSolutions";
import Community from "@/pages/Community";
import Members from "@/pages/Members";
import CampusMap from "@/pages/CampusMap";
import ProfileCompletion from "@/pages/ProfileCompletion";
import LiveSports from "@/pages/LiveSports";
import CoogpawsChat from "@/pages/CoogpawsChat";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import LoginEmail from "@/pages/LoginEmail";
import LoginLocal from "@/pages/LoginLocal";
import MemberDashboard from "@/pages/MemberDashboard";
import JoinPage from "@/pages/JoinPage";
import LocalProfile from "@/pages/LocalProfile";
import SessionTest from "@/pages/SessionTest";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={MemberDashboard} />
      <Route path="/forums" component={Forums} />
      <Route path="/news" component={News} />
      <Route path="/store" component={Store} />
      <Route path="/store/wear-your-pride" component={WearYourPride} />
      <Route path="/store/everyday-alumni" component={EverydayAlumni} />
      <Route path="/store/keepsakes-gifts" component={KeepsakesGifts} />
      <Route path="/store/limited-editions" component={LimitedEditions} />
      <Route path="/cart" component={Cart} />
      <Route path="/profile" component={Profile} />
      <Route path="/events" component={Events} />
      <Route path="/admin/news" component={NewsAdmin} />
      <Route path="/profile/advanced" component={AdvancedProfile} />
      <Route path="/messages" component={Messages} />
      <Route path="/event-management" component={EventManagement} />
      <Route path="/admin" component={SimpleAdminDashboard} />
      <Route path="/admin-full" component={AdminDashboard} />
      <Route path="/test-admin" component={TestAdmin} />
      <Route path="/life-happens" component={LifeHappens} />
      <Route path="/life-solutions" component={LifeSolutions} />
      <Route path="/community" component={Community} />
      <Route path="/members" component={Members} />
      <Route path="/terms" component={CampusMap} />
      <Route path="/complete-profile" component={ProfileCompletion} />
      <Route path="/login" component={Login} />
      <Route path="/login/email" component={LoginEmail} />
      <Route path="/login/other" component={LoginLocal} />
      <Route path="/signup" component={Signup} />
      <Route path="/join" component={JoinPage} />
      <Route path="/member-dashboard" component={MemberDashboard} />
      <Route path="/profile/local" component={LocalProfile} />
      <Route path="/session-test" component={SessionTest} />
      <Route path="/live-sports" component={LiveSports} />
      <Route path="/coogpaws-chat" component={CoogpawsChat} />
      <Route path="/forums/categories/:categoryId" component={ForumCategory} />
      <Route path="/forums/topics/:topicId" component={ForumTopic} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const isLandingPage = location === '/';
  const { isOpen, pendingUrl, handleContinue, handleClose } = useExternalLinkDisclaimer();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <Toaster />
            <Router />
          </div>
          {isLandingPage && (
            <footer className="w-full text-center mt-8">
              <p className="text-black text-xs max-w-4xl mx-auto leading-relaxed">
                This site is not endorsed, affiliated or connected with the University of Houston, it is a Fan Site dedicated to the Students, Alumni, Faculty and Fans of the "University of Houston" all images, logos, art are creations of and by Coogsnation.com, they are Trademarked and the sole possession of Coogsnation.com and cannot be used without the expressed consent of Coogsnation.com.
              </p>
            </footer>
          )}
        </div>
        <ExternalLinkDisclaimer
          isOpen={isOpen}
          onClose={handleClose}
          onContinue={handleContinue}
          url={pendingUrl}
        />
        <ChatWidget />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
