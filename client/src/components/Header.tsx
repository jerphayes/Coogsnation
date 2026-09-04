import type { ReactNode } from "react";
import { useState } from "react";
import logoImage from "@assets/webiste master logo_1761671161849.jpg";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useGuest } from "@/hooks/useGuest";
import { queryClient } from "@/lib/queryClient";
import { FORUM_NAVIGATION, forumCategoryPath } from "@/lib/forumNavigation";
import { LiveScoreTicker } from "@/components/LiveScoreTicker";

export function Header({ leadingBrand }: { leadingBrand?: ReactNode } = {}) {
  const { isAuthenticated, user } = useAuth();
  const { isGuestMode, enableGuestMode } = useGuest();
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [forumsOpen, setForumsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const closeMenus = () => {
    setMobileOpen(false);
    setForumsOpen(false);
    setMembersOpen(false);
    setShoppingOpen(false);
    setCommunityOpen(false);
    setLoginOpen(false);
    setJoinOpen(false);
  };

  const handleGuestClick = () => {
    closeMenus();
    enableGuestMode();
    navigate("/forums");
  };

  const handleLogout = async () => {
    localStorage.removeItem("guestMode");
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("Logout failed");
      queryClient.setQueryData(["/api/auth/user"], null);
    } finally {
      closeMenus();
      navigate("/");
    }
  };

  const forumsLinks = (
    <>
      <HeaderMenuLink href="/forums?tab=sports" onNavigate={closeMenus}>
        🏟️ Sports Forums
      </HeaderMenuLink>
      <HeaderMenuLink href="/coogpaws-chat" onNavigate={closeMenus} testId="link-coogpaws">
        🐾 Coog Paws Lounge
      </HeaderMenuLink>
      <HeaderMenuLink
        href={forumCategoryPath(FORUM_NAVIGATION.waterCooler.slug)}
        onNavigate={closeMenus}
        testId="link-watercooler"
      >
        ☕ Water Cooler Talk
      </HeaderMenuLink>
      <HeaderMenuLink
        href={forumCategoryPath(FORUM_NAVIGATION.hallOfFame.slug)}
        onNavigate={closeMenus}
        testId="link-halloffame"
      >
        🏆 Coog's Hall of Fame
      </HeaderMenuLink>
    </>
  );

  const communityLinks = (
    <>
      <HeaderMenuLink href="/life-happens" onNavigate={closeMenus} testId="link-lifehappens">
        🌟 Life Happens
      </HeaderMenuLink>
      <HeaderMenuLink href="/life-solutions" onNavigate={closeMenus} testId="link-lifesolutions">
        💡 Life Solutions
      </HeaderMenuLink>
      <HeaderMenuLink href="/members" onNavigate={closeMenus}>
        👥 Members
      </HeaderMenuLink>
      <HeaderMenuLink href="/events" onNavigate={closeMenus}>
        📅 Events
      </HeaderMenuLink>
    </>
  );

  return (
    <header className="relative z-50 border-b border-gray-700 bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          {leadingBrand}
          <Link href="/" className="flex items-center" onClick={closeMenus}>
            <img src={logoImage} alt="CoogsNation Logo" className="h-12 w-12 object-contain" />
          </Link>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">

            <div className="relative flex items-center gap-1">
              <DesktopLink href="/forums" testId="link-forums">Forums</DesktopLink>
              <button
                type="button"
                onClick={() => {
                  setMembersOpen(false);
                  setShoppingOpen(false);
                  setCommunityOpen(false);
                  setForumsOpen((open) => !open);
                }}
                className="font-bold text-white transition-colors hover:text-red-500"
                aria-expanded={forumsOpen}
                aria-controls="desktop-forums-menu"
                aria-label="Open Forums menu"
                data-testid="button-forums-menu"
              >
                ▼
              </button>
              {forumsOpen && (
                <div
                  id="desktop-forums-menu"
                  className="absolute left-0 top-full z-[60] mt-2 min-w-[230px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
                >
                  <HeaderMenuLink href="/forums" onNavigate={closeMenus}>
                    Forums Home
                  </HeaderMenuLink>
                  {forumsLinks}
                </div>
              )}
            </div>

            <div className="relative flex items-center gap-1">
              <DesktopLink href="/members" testId="link-members">Members</DesktopLink>
              <button
                type="button"
                onClick={() => {
                  setForumsOpen(false);
                  setShoppingOpen(false);
                  setCommunityOpen(false);
                  setMembersOpen((open) => !open);
                }}
                className="font-bold text-white transition-colors hover:text-red-500"
                aria-expanded={membersOpen}
                aria-controls="desktop-members-menu"
                aria-label="Open Members menu"
                data-testid="button-members-menu"
              >
                ▼
              </button>
              {membersOpen && (
                <div
                  id="desktop-members-menu"
                  className="absolute left-0 top-full z-[60] mt-2 min-w-[220px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
                >
                  <HeaderMenuLink href="/members" onNavigate={closeMenus}>Member Directory</HeaderMenuLink>
                  <HeaderMenuLink href="/messages" onNavigate={closeMenus}>Messages</HeaderMenuLink>
                  <HeaderMenuLink href="/events" onNavigate={closeMenus}>Events</HeaderMenuLink>
                </div>
              )}
            </div>

            <div className="relative flex items-center gap-1">
              <DesktopLink href="/store" testId="link-store">Shopping</DesktopLink>
              <button
                type="button"
                onClick={() => {
                  setForumsOpen(false);
                  setMembersOpen(false);
                  setCommunityOpen(false);
                  setShoppingOpen((open) => !open);
                }}
                className="font-bold text-white transition-colors hover:text-red-500"
                aria-expanded={shoppingOpen}
                aria-controls="desktop-shopping-menu"
                aria-label="Open Shopping menu"
                data-testid="button-shopping-menu"
              >
                ▼
              </button>
              {shoppingOpen && (
                <div
                  id="desktop-shopping-menu"
                  className="absolute left-0 top-full z-[60] mt-2 min-w-[230px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
                >
                  <HeaderMenuLink href="/store" onNavigate={closeMenus}>Store Home</HeaderMenuLink>
                  <HeaderMenuLink href="/store/wear-your-pride" onNavigate={closeMenus}>Wear Your Pride</HeaderMenuLink>
                  <HeaderMenuLink href="/store/keepsakes-gifts" onNavigate={closeMenus}>Keepsakes & Gifts</HeaderMenuLink>
                  <HeaderMenuLink href="/store/limited-editions" onNavigate={closeMenus}>Limited Editions</HeaderMenuLink>
                  <HeaderMenuLink href="/store/legacy-jewelry" onNavigate={closeMenus}>Legacy Jewelry</HeaderMenuLink>
                  <HeaderMenuLink href="/cart" onNavigate={closeMenus}>🛒 Cart</HeaderMenuLink>
                </div>
              )}
            </div>

            <DesktopLink
              href="/forums?tab=community#coogs-marketplace"
              testId="link-coogs-marketplace"
            >
              Coog&apos;s Marketplace
            </DesktopLink>

            <div className="relative flex items-center gap-1">
              <DesktopLink href="/forums?tab=community" testId="link-community">Community</DesktopLink>
              <button
                type="button"
                onClick={() => {
                  setForumsOpen(false);
                  setMembersOpen(false);
                  setShoppingOpen(false);
                  setCommunityOpen((open) => !open);
                }}
                className="font-bold text-white transition-colors hover:text-red-500"
                aria-expanded={communityOpen}
                aria-controls="desktop-community-menu"
                aria-label="Open Community menu"
                data-testid="button-community-menu"
              >
                ▼
              </button>
              {communityOpen && (
                <div
                  id="desktop-community-menu"
                  className="absolute left-0 top-full z-[60] mt-2 min-w-[220px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
                >
                  <HeaderMenuLink href="/forums?tab=community" onNavigate={closeMenus}>
                    Community Home
                  </HeaderMenuLink>
                  {communityLinks}
                </div>
              )}
            </div>

            <DesktopLink href="/get-em" testId="link-getem">Pick'Em</DesktopLink>

          </nav>
        </div>

        <div className="hidden items-center gap-4 md:flex">
          {isAuthenticated ? (
            <>
              <DesktopLink href="/dashboard" testId="link-dashboard">Dashboard</DesktopLink>
              {user?.role === "admin" && (
                <Link href="/admin" className="font-bold text-red-400 hover:text-red-300" data-testid="link-admin-dashboard">
                  Admin
                </Link>
              )}
              <button type="button" onClick={handleLogout} className="font-bold text-white hover:text-red-500" data-testid="button-logout">
                Logout
              </button>
            </>
          ) : isGuestMode ? (
            <>
              <button
                type="button"
                onClick={handleGuestClick}
                className="text-sm font-bold text-yellow-400 hover:text-yellow-300"
                data-testid="text-guestmode"
                aria-pressed="true"
              >
                👤 Guest
              </button>
              <DesktopLink href="/join" testId="button-join">Sign Up</DesktopLink>
              <DesktopLink href="/login" testId="button-login">Login</DesktopLink>
            </>
          ) : (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLoginOpen((open) => !open)}
                  className="flex items-center gap-1 font-bold text-white hover:text-red-500"
                  aria-expanded={loginOpen}
                  aria-controls="desktop-login-menu"
                  data-testid="button-login-dropdown"
                >
                  Login <span aria-hidden="true">▼</span>
                </button>
                {loginOpen && (
                  <div id="desktop-login-menu" className="absolute right-0 top-full z-[60] mt-2 min-w-[220px] overflow-hidden rounded-md border bg-white shadow-lg">
                    <HeaderMenuLink href="/login" onNavigate={closeMenus} testId="link-login-site">🔑 Login to Site</HeaderMenuLink>
                    <HeaderMenuLink href="/login/email" onNavigate={closeMenus} testId="link-login-email">Login with Email</HeaderMenuLink>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setJoinOpen((open) => !open)}
                  className="flex items-center gap-1 font-bold text-white hover:text-red-500"
                  aria-expanded={joinOpen}
                  aria-controls="desktop-join-menu"
                  data-testid="button-join-dropdown"
                >
                  Join <span aria-hidden="true">▼</span>
                </button>
                {joinOpen && (
                  <div id="desktop-join-menu" className="absolute right-0 top-full z-[60] mt-2 min-w-[180px] overflow-hidden rounded-md border bg-white shadow-lg">
                    <HeaderMenuLink href="/join" onNavigate={closeMenus} testId="link-signup">Sign Up</HeaderMenuLink>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleGuestClick}
                className="font-bold text-red-500 hover:text-red-400"
                data-testid="button-guest"
                aria-pressed="false"
              >
                👤 Guest
              </button>
            </>
          )}
          <DesktopLink href="/terms" testId="link-terms">Terms</DesktopLink>
        </div>

        <button
          type="button"
          className="rounded border border-gray-600 px-3 py-2 text-white md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          aria-label="Open navigation menu"
          data-testid="button-mobile-menu"
        >
          <span aria-hidden="true">☰</span>
        </button>
      </div>

      {mobileOpen && (
        <nav id="mobile-navigation" className="border-t border-gray-700 bg-gray-900 px-4 py-4 md:hidden" aria-label="Mobile navigation">
          <div className="grid gap-1">
            <MobileLink href="/forums" onNavigate={closeMenus}>Standard Board</MobileLink>
            <MobileLink href="/coogpaws-chat" onNavigate={closeMenus}>Coog Paws Lounge</MobileLink>
            <MobileLink href={forumCategoryPath(FORUM_NAVIGATION.waterCooler.slug)} onNavigate={closeMenus}>Water Cooler Talk</MobileLink>
            <MobileLink href="/members" onNavigate={closeMenus}>Members</MobileLink>
            <MobileLink href="/messages" onNavigate={closeMenus}>Messages</MobileLink>
            <MobileLink href="/events" onNavigate={closeMenus}>Events</MobileLink>
            <MobileLink href="/store" onNavigate={closeMenus}>Shopping</MobileLink>
            <MobileLink
              href="/forums?tab=community#coogs-marketplace"
              onNavigate={closeMenus}
            >
              Coog&apos;s Marketplace
            </MobileLink>
            <MobileLink href="/forums?tab=community" onNavigate={closeMenus}>Community</MobileLink>
            <MobileLink href="/get-em" onNavigate={closeMenus}>Pick'Em</MobileLink>
            <MobileLink href="/terms" onNavigate={closeMenus}>Terms</MobileLink>

            <div className="my-2 border-t border-gray-700" />
            {isAuthenticated ? (
              <>
                <MobileLink href="/dashboard" onNavigate={closeMenus}>Dashboard</MobileLink>
                {user?.role === "admin" && <MobileLink href="/admin" onNavigate={closeMenus}>Admin</MobileLink>}
                <button type="button" onClick={handleLogout} className="rounded px-3 py-3 text-left font-bold text-white hover:bg-gray-800">
                  Logout
                </button>
              </>
            ) : (
              <>
                <MobileLink href="/login" onNavigate={closeMenus}>Login</MobileLink>
                <MobileLink href="/join" onNavigate={closeMenus}>Sign Up</MobileLink>
                <button
                  type="button"
                  onClick={handleGuestClick}
                  className="rounded px-3 py-3 text-left font-bold text-red-400 hover:bg-gray-800"
                  data-testid="button-guest-mobile"
                >
                  👤 Guest
                </button>
              </>
            )}
          </div>
        </nav>
      )}
      <LiveScoreTicker />
    </header>
  );
}

function DesktopLink(props: { href: string; children: ReactNode; testId?: string }) {
  return (
    <Link href={props.href} className="font-bold text-white transition-colors hover:text-red-500" data-testid={props.testId}>
      {props.children}
    </Link>
  );
}

function HeaderMenuLink(props: { href: string; children: ReactNode; onNavigate: () => void; testId?: string }) {
  return (
    <Link
      href={props.href}
      onClick={props.onNavigate}
      className="block border-b border-gray-200 px-4 py-2 text-gray-800 last:border-b-0 hover:bg-gray-100"
      data-testid={props.testId}
    >
      {props.children}
    </Link>
  );
}

function MobileLink(props: { href: string; children: ReactNode; onNavigate: () => void }) {
  return (
    <Link href={props.href} onClick={props.onNavigate} className="rounded px-3 py-3 font-bold text-white hover:bg-gray-800">
      {props.children}
    </Link>
  );
}
