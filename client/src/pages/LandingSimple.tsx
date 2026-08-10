import { useEffect, useState } from "react";
import bannerImage from "@assets/file_00000000881861f9be677e55822b57a5_1757784057972.png";
import logoImage from "@assets/webiste master logo_1761671161849.jpg";
import { useAuth } from "@/hooks/useAuth";

type MenuItem = {
  label: string;
  description?: string;
  href: string;
  icon?: string;
};

type DropdownProps = {
  id: string;
  label: string;
  items: MenuItem[];
  openMenu: string | null;
  setOpenMenu: (value: string | null) => void;
  align?: "left" | "right";
};

function Dropdown({
  id,
  label,
  items,
  openMenu,
  setOpenMenu,
  align = "left",
}: DropdownProps) {
  const open = openMenu === id;

  return (
    <div
      className="cn-dropdown-wrap"
      onMouseEnter={() => setOpenMenu(id)}
      onMouseLeave={() => setOpenMenu(null)}
    >
      <button
        type="button"
        className="cn-nav-dropdown-button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpenMenu(open ? null : id)}
      >
        {label} ▼
      </button>

      <div
        className={`cn-dropdown ${open ? "is-open" : ""} ${
          align === "right" ? "align-right" : ""
        }`}
        role="menu"
      >
        {items.map((item) => (
          <a
            key={`${id}-${item.label}`}
            href={item.href}
            className="cn-dropdown-item"
            role="menuitem"
          >
            <span className="cn-menu-icon">
              {item.icon || "•"}
            </span>

            <span>
              <strong>{item.label}</strong>

              {item.description && (
                <small>{item.description}</small>
              )}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

type FeatureCardProps = {
  id: string;
  icon: string;
  title: string;
  description: string;
  items: MenuItem[];
  openMenu: string | null;
  setOpenMenu: (value: string | null) => void;
};

function FeatureCard({
  id,
  icon,
  title,
  description,
  items,
  openMenu,
  setOpenMenu,
}: FeatureCardProps) {
  const open = openMenu === id;

  return (
    <div
      className={`cn-feature-card ${open ? "is-open" : ""}`}
      onMouseEnter={() => setOpenMenu(id)}
      onMouseLeave={() => setOpenMenu(null)}
    >
      <button
        type="button"
        className="cn-feature-trigger"
        aria-expanded={open}
        onClick={() => setOpenMenu(open ? null : id)}
      >
        <span className="cn-feature-icon">{icon}</span>
        <span className="cn-feature-title">{title}</span>

        <span className="cn-feature-description">
          {description}
        </span>

        <span className="cn-feature-open">
          {open ? "Close ▲" : "Explore ▼"}
        </span>
      </button>

      <div
        className={`cn-feature-dropdown ${
          open ? "is-open" : ""
        }`}
      >
        {items.map((item) => (
          <a
            key={`${id}-${item.label}`}
            href={item.href}
            className="cn-feature-item"
          >
            <span className="cn-menu-icon">
              {item.icon || "•"}
            </span>

            <span>
              <strong>{item.label}</strong>

              {item.description && (
                <small>{item.description}</small>
              )}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, isAuthenticated } = useAuth();

  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  const [forumCategoryLinks, setForumCategoryLinks] =
    useState<Record<string, string>>({});

  const [devGuestEnabled, setDevGuestEnabled] =
    useState(false);

  const [devGuestRemaining, setDevGuestRemaining] =
    useState(0);

  const [devGuestStarting, setDevGuestStarting] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/forums/categories", {
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Forum categories: ${response.status}`
          );
        }

        return response.json();
      })
      .then((categories) => {
        if (
          cancelled ||
          !Array.isArray(categories)
        ) {
          return;
        }

        const links: Record<string, string> = {};

        for (const category of categories) {
          if (
            category &&
            typeof category.name === "string" &&
            Number.isFinite(Number(category.id))
          ) {
            links[
              category.name
                .trim()
                .toLowerCase()
            ] =
              `/forums/categories/${Number(category.id)}`;
          }
        }

        setForumCategoryLinks(links);
      })
      .catch((error) => {
        console.warn(
          "Could not resolve forum category links:",
          error,
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch("/api/auth/dev-guest/status", {
      credentials: "same-origin",
    })
      .then((response) => response.json())
      .then((data) => {
        setDevGuestEnabled(Boolean(data?.enabled));

        setDevGuestRemaining(
          Math.max(
            0,
            Number(data?.remaining) || 0,
          ),
        );
      })
      .catch(() => {
        setDevGuestEnabled(false);
      });
  }, []);

  const forumHref = (name: string) =>
    forumCategoryLinks[
      name.trim().toLowerCase()
    ] || "/forums";

  const forumItems: MenuItem[] = [
    {
      label: "Football",
      href: forumHref("Football"),
      icon: "🏈",
      description: "Houston Cougar football discussions.",
    },
    {
      label: "Basketball",
      href: forumHref("Basketball"),
      icon: "🏀",
      description: "Houston Cougar basketball discussions.",
    },
    {
      label: "Baseball",
      href: forumHref("Baseball"),
      icon: "⚾",
      description: "Houston Cougar baseball.",
    },
    {
      label: "Track & Field",
      href: forumHref("Track & Field"),
      icon: "🏃",
      description: "Houston Cougar track and field.",
    },
    {
      label: "Golf",
      href: forumHref("Golf"),
      icon: "⛳",
      description: "Houston Cougar golf.",
    },
    {
      label: "Other Sports Men",
      href: forumHref("Other Sports Men"),
      icon: "🏆",
      description: "Other Houston Cougar men's athletics.",
    },
    {
      label: "Women's Sports",
      href: forumHref("Women's Sports"),
      icon: "👟",
      description: "Houston Cougar women's athletics.",
    },
    {
      label: "Women's Basketball",
      href: forumHref("Women's Basketball"),
      icon: "🏀",
    },
    {
      label: "Women's Golf",
      href: forumHref("Women's Golf"),
      icon: "⛳",
    },
    {
      label: "Women's Soccer",
      href: forumHref("Women's Soccer"),
      icon: "⚽",
    },
    {
      label: "Softball",
      href: forumHref("Softball"),
      icon: "🥎",
    },
    {
      label: "Women's Tennis",
      href: forumHref("Women's Tennis"),
      icon: "🎾",
    },
    {
      label: "Women's Track & Field",
      href: forumHref("Women's Track & Field"),
      icon: "🏃",
    },
    {
      label: "Women's Swimming & Diving",
      href: forumHref("Women's Swimming & Diving"),
      icon: "🏊",
    },
    {
      label: "Recruiting",
      href: forumHref("Recruiting"),
      icon: "📋",
      description: "Recruiting news and commitments.",
    },
    {
      label: "Cougar Corner",
      href: forumHref("Cougar Corner"),
      icon: "🏠",
      description: "General UH discussion and campus life.",
    },
    {
      label: "Politics",
      href: forumHref("Politics"),
      icon: "🌎",
      description: "Political discussions and current events.",
    },
    {
      label: "Business",
      href: forumHref("Business"),
      icon: "💼",
      description: "Business and career discussion.",
    },
    {
      label: "Technology",
      href: forumHref("Technology"),
      icon: "💻",
      description: "Technology, AI, gadgets, and programming.",
    },
    {
      label: "Entertainment",
      href: forumHref("Entertainment"),
      icon: "🎬",
      description: "Movies, television, music, and pop culture.",
    },
    {
      label: "Food & Dining",
      href: forumHref("Food & Dining"),
      icon: "🍽️",
      description: "Restaurants, food, and dining.",
    },
    {
      label: "Real Estate",
      href: forumHref("Real Estate"),
      icon: "🏡",
      description: "Houston-area property and housing.",
    },
    {
      label: "Classifieds",
      href: forumHref("Classifieds"),
      icon: "🛒",
      description: "Buy, sell, and trade with fellow Coogs.",
    },
    {
      label: "Premium Lounge",
      href: forumHref("Premium Lounge"),
      icon: "⭐",
    },
    {
      label: "Game Day Central",
      href: forumHref("Game Day Central"),
      icon: "📣",
      description: "Live games and watch-party conversation.",
    },
    {
      label: "Alumni Network",
      href: forumHref("Alumni Network"),
      icon: "🎓",
    },
    {
      label: "Professional Networking",
      href: forumHref("Professional Networking"),
      icon: "🤝",
    },
    {
      label: "Water Cooler Talk",
      href: forumHref("Water Cooler Talk"),
      icon: "☕",
      description: "General conversation beyond sports.",
    },
    {
      label: "UH Hall of Fame",
      href: forumHref("UH Hall of Fame"),
      icon: "🏅",
    },
    {
      label: "Academic Discussion",
      href: forumHref("Academic Discussion"),
      icon: "📚",
    },
    {
      label: "Student Life",
      href: forumHref("Student Life"),
      icon: "🏫",
    },
    {
      label: "Campus Events",
      href: "/events",
      icon: "📅",
    },
    {
      label: "View All Forums",
      href: "/forums",
      icon: "💬",
    },
  ];

  const sportsItems: MenuItem[] = [
    {
      label: "Football News",
      href: "/news?category=football",
      icon: "🏈",
      description: "Cougar football news and updates.",
    },
    {
      label: "Basketball News",
      href: "/news?category=basketball",
      icon: "🏀",
      description: "Cougar basketball coverage.",
    },
    {
      label: "Big 12 News",
      href: "/news?category=big12",
      icon: "🏆",
      description: "Conference news and updates.",
    },
    {
      label: "Live Sports",
      href: "/live-sports",
      icon: "📡",
      description: "Game-day information and listening options.",
    },
    {
      label: "All News",
      href: "/news",
      icon: "📰",
    },
  ];

  const communityItems: MenuItem[] = [
    {
      label: "Coog Paws Chat",
      href: "/coogpaws-chat",
      icon: "🐾",
      description: "Connect with fellow Coogs.",
    },
    {
      label: "Water Cooler Talk",
      href: forumHref("Water Cooler Talk"),
      icon: "☕",
      description: "General conversation beyond sports.",
    },
    {
      label: "Life Happens",
      href: "/life-happens",
      icon: "💸",
      description: "Everyday community resources.",
    },
    {
      label: "Life Solutions",
      href: "/life-solutions",
      icon: "🛠️",
      description: "Useful Houston-area resources.",
    },
    {
      label: "Members",
      href: "/members",
      icon: "👥",
    },
    {
      label: "Events",
      href: "/events",
      icon: "📅",
    },
  ];

  const loginItems: MenuItem[] = [
    {
      label: "Login with Email",
      href: "/login/email?redirect=/dashboard",
      icon: "🔑",
    },
    {
      label: "Other Login Options",
      href: "/login/other?redirect=/dashboard",
      icon: "👤",
    },
  ];

  const joinItems: MenuItem[] = [
    {
      label: "Join CoogsNation",
      href: "/join",
      icon: "🐾",
      description: "Become part of the Coogs community.",
    },
    {
      label: "Create Account",
      href: "/signup",
      icon: "✍️",
    },
  ];

  async function startDevGuest() {
    if (
      devGuestStarting ||
      devGuestRemaining <= 0
    ) {
      return;
    }

    setDevGuestStarting(true);

    try {
      const response =
        await fetch("/api/auth/dev-guest", {
          method: "POST",
          credentials: "same-origin",
        });

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        setDevGuestRemaining(
          Math.max(
            0,
            Number(data?.remaining) || 0,
          ),
        );

        window.alert(
          data?.message ||
          "Guest test access could not be started.",
        );

        return;
      }

      setDevGuestRemaining(
        Math.max(
          0,
          Number(data?.remaining) || 0,
        ),
      );

      window.location.href =
        data?.redirect || "/dashboard";

    } finally {
      setDevGuestStarting(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <div className="cn-home">
      <style>{`
        .cn-home {
          min-height: 100vh;
          background: #f5f6f8;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
        }

        .cn-nav {
          position: relative;
          z-index: 100;
          min-height: 72px;
          padding: 10px 22px;
          background: #111827;
          border-bottom: 1px solid rgba(255,255,255,.12);
          display: flex;
          align-items: center;
          gap: 22px;
          flex-wrap: wrap;
        }

        .cn-logo-link {
          display: inline-flex;
          align-items: center;
        }

        .cn-logo {
          width: 48px;
          height: 48px;
          object-fit: contain;
          border-radius: 50%;
        }

        .cn-nav-link,
        .cn-nav-dropdown-button,
        .cn-nav-action {
          color: #f21f46 !important;
          font-weight: 800;
          text-decoration: none !important;
          background: none;
          border: 0;
          cursor: pointer;
          font-size: 15px;
          padding: 9px 0;
          white-space: nowrap;
        }

        .cn-nav-link:hover,
        .cn-nav-dropdown-button:hover,
        .cn-nav-action:hover {
          color: #ffffff !important;
        }

        .cn-nav-spacer {
          flex: 1 1 auto;
        }

        .cn-guest-link {
          color: #facc15 !important;
        }

        .cn-dropdown-wrap {
          position: relative;
        }

        .cn-dropdown {
          position: absolute;
          top: calc(100% - 1px);
          left: -12px;
          min-width: 270px;
          max-height: 480px;
          overflow-y: auto;
          padding: 8px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          box-shadow: 0 18px 35px rgba(0,0,0,.22);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-3px);
          transition: opacity .12s ease, transform .12s ease;
          z-index: 200;
        }

        .cn-dropdown.align-right {
          left: auto;
          right: -12px;
        }

        .cn-dropdown.is-open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .cn-dropdown-item,
        .cn-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 11px 12px;
          color: #111827 !important;
          text-decoration: none !important;
          border-radius: 7px;
        }

        .cn-dropdown-item:hover,
        .cn-feature-item:hover {
          background: #fff1f2;
          color: #c8102e !important;
        }

        .cn-dropdown-item small,
        .cn-feature-item small {
          display: block;
          margin-top: 3px;
          color: #6b7280;
          font-size: 12px;
          font-weight: 400;
          line-height: 1.3;
        }

        .cn-menu-icon {
          width: 24px;
          flex: 0 0 24px;
          text-align: center;
        }

        .cn-hero {
          position: relative;
          min-height: 610px;
          overflow: hidden;
          background: #070d13;
          isolation: isolate;
        }

        .cn-hero-blur {
          position: absolute;
          inset: -30px;
          z-index: -4;
          background-image: url(${bannerImage});
          background-size: cover;
          background-position: center;
          filter: blur(14px);
          transform: scale(1.08);
          opacity: .34;
        }

        .cn-hero-art {
          position: absolute;
          z-index: -3;
          top: 18px;
          right: 1.5%;
          width: 57%;
          height: calc(100% - 18px);
          object-fit: contain;
          object-position: center;
          filter: saturate(1.1) contrast(1.03);
        }

        .cn-hero-overlay {
          position: absolute;
          inset: 0;
          z-index: -2;
          background:
            linear-gradient(
              90deg,
              rgba(3,7,12,.96) 0%,
              rgba(3,7,12,.86) 34%,
              rgba(3,7,12,.46) 58%,
              rgba(3,7,12,.22) 100%
            ),
            linear-gradient(
              0deg,
              rgba(3,7,12,.72) 0%,
              transparent 45%
            );
        }

        .cn-hero-copy {
          min-height: 610px;
          max-width: 720px;
          padding: 100px 40px 90px max(40px, 6vw);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          color: white;
          text-align: left;
        }

        .cn-eyebrow {
          margin-bottom: 14px;
          color: #ff8a9d;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: .28em;
          text-transform: uppercase;
        }

        .cn-hero h1 {
          margin: 0;
          max-width: 700px;
          color: #ffffff;
          font-size: clamp(46px, 5.4vw, 82px);
          line-height: .98;
          letter-spacing: -.035em;
          text-shadow: 0 4px 22px rgba(0,0,0,.7);
        }

        .cn-hero-copy p {
          max-width: 650px;
          margin: 24px 0 0;
          color: #f3f4f6;
          font-size: clamp(17px, 1.4vw, 22px);
          line-height: 1.55;
        }

        .cn-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .cn-primary,
        .cn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 22px;
          border-radius: 7px;
          font-weight: 900;
          text-decoration: none !important;
        }

        .cn-primary,
        .cn-primary:visited,
        .cn-primary:hover,
        .cn-primary:active {
          color: #ffffff !important;
          background: #e3163f;
          border: 2px solid #e3163f;
        }

        .cn-secondary,
        .cn-secondary:visited,
        .cn-secondary:hover,
        .cn-secondary:active {
          color: #ffffff !important;
          border: 2px solid rgba(255,255,255,.78);
          background: rgba(0,0,0,.28);
        }

        .cn-feature-section {
          position: relative;
          z-index: 20;
          padding: 42px 24px 110px;
          background: #f5f6f8;
        }

        .cn-feature-heading {
          max-width: 1100px;
          margin: 0 auto 30px;
          text-align: center;
        }

        .cn-feature-heading h2 {
          margin: 0 0 8px;
          color: #111827;
          font-size: clamp(26px, 3vw, 38px);
        }

        .cn-feature-heading p {
          margin: 0;
          color: #596273;
          font-size: 16px;
        }

        .cn-feature-grid {
          max-width: 1120px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          align-items: start;
        }

        .cn-feature-card {
          position: relative;
          min-height: 220px;
          border: 1px solid #d8dde5;
          border-radius: 12px;
          background: white;
          box-shadow: 0 5px 16px rgba(16,24,40,.06);
        }

        .cn-feature-card:hover,
        .cn-feature-card.is-open {
          box-shadow: 0 18px 30px rgba(126,0,25,.13);
          z-index: 30;
        }

        .cn-feature-trigger {
          width: 100%;
          min-height: 220px;
          padding: 27px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          color: #111827;
          background: transparent;
          border: 0;
          cursor: pointer;
        }

        .cn-feature-icon {
          font-size: 35px;
          margin-bottom: 16px;
        }

        .cn-feature-title {
          color: #a10022;
          font-size: 21px;
          font-weight: 900;
        }

        .cn-feature-description {
          margin-top: 9px;
          color: #5b6474;
          line-height: 1.45;
        }

        .cn-feature-open {
          margin-top: auto;
          padding-top: 17px;
          color: #df153d;
          font-size: 13px;
          font-weight: 900;
        }

        .cn-feature-dropdown {
          position: absolute;
          top: calc(100% - 1px);
          left: 0;
          right: 0;
          max-height: 430px;
          overflow-y: auto;
          padding: 8px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          box-shadow: 0 20px 38px rgba(0,0,0,.18);
          opacity: 0;
          visibility: hidden;
          transform: translateY(-2px);
          transition: opacity .12s ease, transform .12s ease;
          z-index: 100;
        }

        .cn-feature-dropdown.is-open {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        @media (max-width: 900px) {
          .cn-nav {
            gap: 14px;
          }

          .cn-nav-spacer {
            display: none;
          }

          .cn-hero {
            min-height: 720px;
          }

          .cn-hero-art {
            top: 14px;
            right: 0;
            width: 100%;
            height: 67%;
            opacity: .82;
          }

          .cn-hero-overlay {
            background:
              linear-gradient(
                0deg,
                rgba(3,7,12,.98) 0%,
                rgba(3,7,12,.90) 39%,
                rgba(3,7,12,.30) 74%,
                rgba(3,7,12,.18) 100%
              );
          }

          .cn-hero-copy {
            min-height: 720px;
            padding: 380px 28px 62px;
            justify-content: flex-end;
          }

          .cn-feature-grid {
            grid-template-columns: 1fr;
          }

          .cn-feature-dropdown {
            position: relative;
            top: auto;
            margin: 0 12px 12px;
            display: none;
            max-height: 430px;
            opacity: 1;
            visibility: visible;
            transform: none;
            box-shadow: none;
          }

          .cn-feature-dropdown.is-open {
            display: block;
          }
        }

        @media (max-width: 620px) {
          .cn-nav {
            padding: 9px 13px;
          }

          .cn-logo {
            width: 42px;
            height: 42px;
          }

          .cn-nav-link,
          .cn-nav-dropdown-button,
          .cn-nav-action {
            font-size: 14px;
          }

          .cn-dropdown {
            position: fixed;
            top: 68px;
            left: 12px !important;
            right: 12px !important;
            width: auto;
          }

          .cn-hero h1 {
            font-size: clamp(39px, 12vw, 58px);
          }

          .cn-hero-copy {
            padding-left: 22px;
            padding-right: 22px;
          }

          .cn-hero-actions {
            width: 100%;
          }

          .cn-primary,
          .cn-secondary {
            width: 100%;
          }

          .cn-feature-section {
            padding-left: 15px;
            padding-right: 15px;
          }
        }
      `}</style>

      <nav className="cn-nav">
        <a
          href="/"
          className="cn-logo-link"
          aria-label="CoogsNation Home"
        >
          <img
            src={logoImage}
            alt="CoogsNation"
            className="cn-logo"
          />
        </a>

        <a href="/forums" className="cn-nav-link">
          Forums
        </a>

        <a href="/members" className="cn-nav-link">
          Members
        </a>

        <a href="/store" className="cn-nav-link">
          Shopping
        </a>

        <Dropdown
          id="top-community"
          label="Community"
          items={communityItems}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        />

        <div className="cn-nav-spacer" />

        {isAuthenticated ? (
          <>
            <a
              href="/dashboard"
              className="cn-nav-link"
            >
              Dashboard
            </a>

            <a
              href="/profile"
              className="cn-nav-link"
            >
              {(user as any)?.handle || "Profile"}
            </a>

            <button
              type="button"
              className="cn-nav-action"
              onClick={logout}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <a
              href="/forums"
              className="cn-nav-link cn-guest-link"
            >
              Continue as Guest
            </a>

            {devGuestEnabled && (
              <button
                type="button"
                className="cn-nav-action cn-guest-link"
                disabled={
                  devGuestStarting ||
                  devGuestRemaining <= 0
                }
                onClick={startDevGuest}
                title="Development testing only"
              >
                {devGuestStarting
                  ? "Starting Guest Test…"
                  : "Guest Full Access"}
              </button>
            )}

            <Dropdown
              id="top-login"
              label="Login"
              items={loginItems}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              align="right"
            />

            <Dropdown
              id="top-join"
              label="Join"
              items={joinItems}
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              align="right"
            />
          </>
        )}

        <a href="/terms" className="cn-nav-link">
          Terms
        </a>
      </nav>

      <section className="cn-hero">
        <div
          className="cn-hero-blur"
          aria-hidden="true"
        />

        <img
          src={bannerImage}
          alt=""
          className="cn-hero-art"
          aria-hidden="true"
        />

        <div
          className="cn-hero-overlay"
          aria-hidden="true"
        />

        <div className="cn-hero-copy">
          <div className="cn-eyebrow">
            COOGSNATION FAN COMMUNITY
          </div>

          <h1>
            WHOSE HOUSE?
            <br />
            COOGS HOUSE!
          </h1>

          <p>
            Talk Cougar sports, follow the community,
            connect with fellow Coogs, and shop —
            without making the experience complicated.
          </p>

          <div className="cn-hero-actions">
            <a
              href="/forums"
              className="cn-primary"
            >
              Enter CoogsNation Forums
            </a>

            {!isAuthenticated && (
              <a
                href="/join"
                className="cn-secondary"
              >
                Join CoogsNation
              </a>
            )}

            <a
              href="/store"
              className="cn-secondary"
            >
              Shop CoogsNation
            </a>
          </div>
        </div>
      </section>

      <section className="cn-feature-section">
        <div className="cn-feature-heading">
          <h2>CoogsNation Community</h2>

          <p>
            Connect, share, and grow with fellow fans
            of the Houston Cougars.
          </p>
        </div>

        <div className="cn-feature-grid">
          <FeatureCard
            id="forums-card"
            icon="💬"
            title="CoogsNation Forums"
            description="Sports, recruiting, Cougar history, general interests and fan discussion."
            items={forumItems}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
          />

          <FeatureCard
            id="sports-card"
            icon="🏈"
            title="Sports & News"
            description="Follow Cougar athletics, Big 12 news and game-day coverage."
            items={sportsItems}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
          />

          <FeatureCard
            id="community-card"
            icon="👥"
            title="Community"
            description="Water Cooler talk, Coog Paws, members, events and resources."
            items={communityItems}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
          />
        </div>
      </section>
    </div>
  );
}
