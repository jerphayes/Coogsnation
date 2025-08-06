import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/LandingSimple";
import Home from "@/pages/Home";
import Forums from "@/pages/Forums";
import News from "@/pages/News";
import Store from "@/pages/Store";
import Cart from "@/pages/Cart";
import Profile from "@/pages/Profile";
import Dashboard from "@/pages/Dashboard";
import Events from "@/pages/Events";
import ForumCategory from "@/pages/ForumCategory";
import ForumTopic from "@/pages/ForumTopic";
import NewsAdmin from "@/pages/NewsAdmin";
import AdvancedProfile from "@/pages/AdvancedProfile";
import Messages from "@/pages/Messages";
import EventManagement from "@/pages/EventManagement";
import EnhancedDashboard from "@/pages/EnhancedDashboard";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={EnhancedDashboard} />
          <Route path="/forums" component={Forums} />
          <Route path="/news" component={News} />
          <Route path="/store" component={Store} />
          <Route path="/cart" component={Cart} />
          <Route path="/profile" component={Profile} />
          <Route path="/events" component={Events} />
          <Route path="/admin/news" component={NewsAdmin} />
          <Route path="/profile/advanced" component={AdvancedProfile} />
          <Route path="/messages" component={Messages} />
          <Route path="/event-management" component={EventManagement} />
          <Route path="/forums/categories/:categoryId" component={ForumCategory} />
          <Route path="/forums/topics/:topicId" component={ForumTopic} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
