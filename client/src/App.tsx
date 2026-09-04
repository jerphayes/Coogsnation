import IntramuralParticipationAgreement from "@/pages/IntramuralParticipationAgreement";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ExternalLinkDisclaimer, useExternalLinkDisclaimer } from "@/components/ExternalLinkDisclaimer";
import { ChatWidget } from "@/components/ChatWidget";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/LandingSimple";
import Forums from "@/pages/Forums";
import News from "@/pages/News";
import Store from "@/pages/Store";
import Cart from "@/pages/Cart";
import WearYourPride from "@/pages/WearYourPride";
import EverydayAlumni from "@/pages/EverydayAlumni";
import KeepsakesGifts from "@/pages/KeepsakesGifts";
import LimitedEditions from "@/pages/LimitedEditions";
import LegacyJewelry from "@/pages/LegacyJewelry";
import CoogsNationOriginals from "@/pages/CoogsNationOriginals";
import StoreConcierge from "@/pages/StoreConcierge";
import Events from "@/pages/Events";
import ForumCategory from "@/pages/ForumCategory";
import ForumTopic from "@/pages/ForumTopic";
import NewsAdmin from "@/pages/NewsAdmin";
import AdvancedProfile from "@/pages/AdvancedProfile";
import Messages from "@/pages/Messages";
import EventManagement from "@/pages/EventManagement";
import OwnerAdminDashboard from "@/pages/OwnerAdminDashboard";
import LifeHappens from "@/pages/LifeHappens";
import LifeSolutions from "@/pages/LifeSolutions";
import Community from "@/pages/Community";
import Members from "@/pages/Members";
import LegalPolicies from "@/pages/LegalPolicies";
import ProfileCompletion from "@/pages/ProfileCompletion";
import JoinGate from "@/pages/JoinGate";
import JoinEmail from "@/pages/JoinEmail";
import LiveSports from "@/pages/LiveSports";
import Intramurals from "@/pages/Intramurals";
import IntramuralLive from "@/pages/IntramuralLive";
import IntramuralTeam from "@/pages/IntramuralTeam";
import IntramuralDemo from "./pages/IntramuralDemo";
import CoogpawsChat from "@/pages/CoogpawsChat";
import Login from "@/pages/Login";
import LoginEmail from "@/pages/LoginEmail";
import MemberDashboard from "@/pages/MemberDashboard";
import GetEmPickEm from "@/pages/GetEmPickEm";
import ResetPassword from "@/pages/ResetPassword";
import { lazy, Suspense } from "react";
import EmailVerificationPending from "@/pages/EmailVerificationPending";
import EmailVerification from "@/pages/EmailVerification";
import PageScrollRecovery from "@/components/PageScrollRecovery";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import SeoHead from "@/components/SeoHead";

/* The immersive venue is code-split: Three.js and the Virtual Venue Engine
 * (~700 KB) download only when a member actually enters a venue. Every other
 * CoogsNation page keeps its current load profile. */
const Venue = lazy(() => import("@/pages/Venue"));

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
      <Route path="/store/legacy-jewelry" component={LegacyJewelry} />
      <Route path="/store/coogsnation-originals" component={CoogsNationOriginals} />
      <Route path="/store/concierge" component={StoreConcierge} />
      <Route path="/cart" component={Cart} />
      <Route path="/profile" component={MemberDashboard} />
      <Route path="/profile/edit" component={ProfileCompletion} />
      <Route path="/events" component={Events} />
      <Route path="/admin/news" component={NewsAdmin} />
      <Route path="/profile/advanced">
        <Redirect to="/profile" />
      </Route>
      <Route path="/messages" component={Messages} />
      <Route path="/event-management" component={EventManagement} />
      <Route path="/admin" component={OwnerAdminDashboard} />
      <Route path="/admin-full" component={OwnerAdminDashboard} />
      <Route path="/life-happens" component={LifeHappens} />
      <Route path="/life-solutions" component={LifeSolutions} />
      <Route path="/community" component={Community} />
      <Route path="/members" component={Members} />
      <Route path="/terms" component={LegalPolicies} />
      <Route path="/complete-profile" component={ProfileCompletion} />
      <Route path="/login" component={Login} />
      <Route path="/login/email" component={LoginEmail} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/login/other" component={Login} />
      <Route path="/join/email" component={JoinEmail} />
      <Route path="/signup" component={JoinGate} />
      <Route path="/join" component={JoinGate} />
        <Route path="/verify-email-pending" component={EmailVerificationPending} />
        <Route path="/verify-email" component={EmailVerification} />
      <Route path="/member-dashboard">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/live-sports" component={LiveSports} />

      <Route path="/intramurals/live" component={IntramuralLive} />
      <Route path="/intramurals/agreement" component={IntramuralParticipationAgreement} />
      <Route path="/intramurals" component={Intramurals} />

      <Route path="/intramurals/teams/:teamId">
        {(params) => (
          <IntramuralTeam
            teamId={params.teamId}
          />
        )}
      </Route>
              <Route path="/intramurals/demo">
                <IntramuralDemo />
              </Route>
      <Route path="/get-em" component={GetEmPickEm} />
      <Route path="/venues/:venueId">
        {(params) => (
          <Suspense fallback={<div className="p-8 text-center text-sm">Loading venue…</div>}>
            <Venue key={params.venueId} />
          </Suspense>
        )}
      </Route>
      <Route path="/venues">
        {() => (
          <Suspense fallback={<div className="p-8 text-center text-sm">Loading venue…</div>}>
            <Venue />
          </Suspense>
        )}
      </Route>
      <Route path="/coogpaws-chat" component={CoogpawsChat} />
      <Route path="/forums/topics/:topicId" component={ForumTopic} />
      <Route path="/forums/categories/:categoryId" component={ForumCategory} />
      <Route path="/forums/:categorySlug" component={ForumCategory} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isOpen, pendingUrl, handleContinue, handleClose } = useExternalLinkDisclaimer();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div
          className="min-h-screen flex flex-col"
          onKeyDown={(event) => {
            if (
              event.key !== "Backspace" &&
              event.key !== "Delete"
            ) {
              return;
            }

            const target =
              event.target as HTMLElement | null;

            const editable =
              target?.closest(
                'input, textarea, [contenteditable="true"], [role="textbox"]',
              );

            if (editable) {
              /*
               * Preserve normal browser editing and
               * stop global application shortcuts from
               * seeing Backspace/Delete.
               */
              event.stopPropagation();
            }
          }}
        >
          <div className="flex-1">
            <Toaster />
            <PageScrollRecovery />
            <AnalyticsTracker />
            <SeoHead />
            <Router />
          </div>
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
