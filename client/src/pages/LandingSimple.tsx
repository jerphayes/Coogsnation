import { useEffect, useState } from "react";
import bannerImage from "@assets/file_00000000881861f9be677e55822b57a5_1757784057972.png";
import logoImage from "@assets/webiste master logo_1761671161849.jpg";
import { useAuth } from "@/hooks/useAuth";
import { LiveScoreTicker } from "@/components/LiveScoreTicker";
import { forumCategoryPath, isVisibleForumCategory } from "@/lib/forumNavigation";

type MenuItem = {
  label: string;
  description?: string;
  href: string;
  icon?: string;
};

type DropdownProps = {
  id: string;
  label: string;
  href?: string;
  items: MenuItem[];
  openMenu: string | null;
  setOpenMenu: (value: string | null) => void;
  align?: "left" | "right";
};

function Dropdown({
  id,
  label,
  href,
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
      {href ? (
        <>
          <a href={href} className="cn-nav-link">{label}</a>
          <button
            type="button"
            className="cn-nav-dropdown-button"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label={`Open ${label} menu`}
            onClick={() => setOpenMenu(open ? null : id)}
          >
            ▼
          </button>
        </>
      ) : (
        <button
          type="button"
          className="cn-nav-dropdown-button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpenMenu(open ? null : id)}
        >
          {label} ▼
        </button>
      )}

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
            typeof category.slug === "string" &&
            isVisibleForumCategory(category)
          ) {
            const slug =
              category.slug
                .trim()
                .toLowerCase();

            links[slug] =
              forumCategoryPath(slug);
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


  const forumHref = (slug: string) =>
    forumCategoryLinks[
      slug.trim().toLowerCase()
    ] || forumCategoryPath(slug);

  /*
   * CANONICAL FRONT-FACING FORUM NAVIGATION
   *
   * Keep this aligned with /forums.
   * 18 top-level cards/destinations only.
   * No retired or legacy individual boards.
   */
  const forumItems: MenuItem[] = [
    {
      label: "Football",
      href: forumHref("football"),
      icon: "🏈",
      description: "Houston Cougar football.",
    },
    {
      label: "Basketball",
      href: forumHref("basketball"),
      icon: "🏀",
      description: "Houston Cougar basketball.",
    },
    {
      label: "Baseball",
      href: forumHref("baseball"),
      icon: "⚾",
      description: "Houston Cougar baseball.",
    },
    {
      label: "Recruiting",
      href: forumHref("recruiting"),
      icon: "📣",
      description: "Recruiting news and commitments.",
    },
    {
      label: "Game Day Central",
      href: forumHref("game-day-central"),
      icon: "📡",
      description: "Game-day discussion and coverage.",
    },
    {
      label: "Tailgate Roundup",
      href: forumHref("tailgate-roundup"),
      icon: "🍔",
      description: "Tailgating and game-day gatherings.",
    },
    {
      label: "Golf",
      href: forumHref("golf"),
      icon: "⛳",
      description: "Houston Cougar golf.",
    },
    {
      label: "Track & Field",
      href: forumHref("track-field"),
      icon: "🏃",
      description: "Houston Cougar track and field.",
    },
    {
      label: "Intramural Sports",
      href: forumHref("other-sports-men"),
      icon: "🏆",
      description: "Activities and announcements on and off campus.",
    },
    {
      label: "Women Sports",
      href: forumHref("womens-sports"),
      icon: "🏅",
      description: "Houston Cougar women's athletics.",
    },
    {
      label: "Coog's Hall of Fame",
      href: forumHref("uh-hall-of-fame"),
      icon: "🏅",
      description: "Houston Cougar history and legends.",
    },
    {
      label: "Ticket Purchase",
      href: "/forums?tab=sports",
      icon: "🎟️",
      description: "Ticketmaster and StubHub purchase options.",
    },
    {
      label: "Coogs Life",
      href: "/forums?tab=community",
      icon: "🐾",
      description: "Campus, alumni, academics, careers, business and technology.",
    },
    {
      label: "Houston Events & Happenings",
      href: "/forums?tab=community",
      icon: "🌆",
      description: "Entertainment, food and things happening around Houston.",
    },
    {
      label: "Coogs Marketplace",
      href: "/forums?tab=community",
      icon: "🛒",
      description: "Buy, sell, trade, property and housing.",
    },
    {
      label: "Current Events",
      href: "/forums?tab=community",
      icon: "🌎",
      description: "National, local and open discussion.",
    },
    {
      label: "Coog Paws Lounge",
      href: "/coogpaws-chat",
      icon: "🐾",
      description: "Live CoogsNation community chat.",
    },
    {
      label: "Water Cooler Talk",
      href: forumHref("water-cooler-talk"),
      icon: "☕",
      description: "General and off-topic community conversation.",
    },
  ];

  const sportsItems: MenuItem[] = [
    {
      label: "Pick 'Em",
      href: "/get-em",
      icon: "🏆",
      description: "Make your picks and compete with fellow Coogs.",
    },
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
          color: #111827;
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

        .cn-pickem-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          padding: 0 24px;
          border: 2px solid #facc15;
          border-radius: 8px;
          background: #facc15;
          color: #111827 !important;
          font-weight: 900;
          letter-spacing: .035em;
          text-decoration: none !important;
          text-transform: uppercase;
          box-shadow:
            0 0 0 4px rgba(250,204,21,.16),
            0 12px 30px rgba(250,204,21,.24);
        }

        .cn-pickem-cta:visited,
        .cn-pickem-cta:hover,
        .cn-pickem-cta:active {
          color: #111827 !important;
        }

        .cn-live-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 52px;
          padding: 0 24px;
          border: 2px solid #B9D9EB;
          border-radius: 8px;
          background: #B9D9EB;
          color: #111827 !important;
          font-weight: 900;
          letter-spacing: .035em;
          text-decoration: none !important;
          text-transform: uppercase;
          box-shadow:
            0 0 0 4px rgba(185,217,235,.16),
            0 12px 30px rgba(185,217,235,.22);
        }

        .cn-live-cta:visited,
        .cn-live-cta:hover,
        .cn-live-cta:active {
          color: #111827 !important;
        }

        .cn-live-cta:hover {
          background: #d7edf7;
          border-color: #d7edf7;
          transform: translateY(-1px);
        }

        .cn-pickem-cta:hover {
          background: #fde047;
          border-color: #fde047;
          transform: translateY(-1px);
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
          color: #111827;
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
          color: #111827;
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

        .cn-community-slogan {
          margin: 0;
          color: #c8102e !important;
          font-size: 18px !important;
          font-weight: 800;
          letter-spacing: .01em;
        }

        .cn-site-footer {
          width: 100%;
          padding: 34px 24px 38px;
          background: #111827;
          border-top: 4px solid #c8102e;
          color: #ffffff;
          text-align: center;
        }

        .cn-site-footer-inner {
          max-width: 1000px;
          margin: 0 auto;
        }

        .cn-site-footer-logo {
          display: block;
          width: min(260px, 74vw);
          height: auto;
          margin: 0 auto;
          object-fit: contain;
        }

        .cn-site-footer-production {
          margin: 16px 0 0;
          color: #ffffff;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: .02em;
        }

        .cn-site-footer-pending {
          margin: 8px 0 0;
          color: #cbd5e1;
          font-size: 13px;
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

          .cn-pickem-cta,
          .cn-live-cta,
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

        <Dropdown
          id="top-forums"
          href="/forums"
          label="Forums"
          items={forumItems}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        />

        <Dropdown
          id="top-members"
          href="/members"
          label="Members"
          items={[
            {
              label: "Member Directory",
              href: "/members",
              icon: "👥",
            },
            {
              label: "Messages",
              href: "/messages",
              icon: "💬",
            },
            {
              label: "Events",
              href: "/events",
              icon: "📅",
            },
            ...(isAuthenticated
              ? [
                  {
                    label: "My Profile",
                    href: "/profile",
                    icon: "👤",
                  },
                  {
                    label: "Dashboard",
                    href: "/dashboard",
                    icon: "🏠",
                  },
                ]
              : []),
          ]}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        />

        <Dropdown
          id="top-shopping"
          href="/store"
          label="Shopping"
          items={[
            {
              label: "Store Home",
              href: "/store",
              icon: "🛍️",
            },
            {
              label: "Wear Your Pride",
              href: "/store/wear-your-pride",
              icon: "👕",
            },
            {
              label: "Everyday Alumni",
              href: "/store/everyday-alumni",
              icon: "🎓",
            },
            {
              label: "Keepsakes & Gifts",
              href: "/store/keepsakes-gifts",
              icon: "🎁",
            },
            {
              label: "Limited Editions",
              href: "/store/limited-editions",
              icon: "⭐",
            },
            {
              label: "Legacy Jewelry",
              href: "/store/legacy-jewelry",
              icon: "💎",
            },
            {
              label: "CoogsNation Originals",
              href: "/store/coogsnation-originals",
              icon: "🐾",
            },
            {
              label: "Store Concierge",
              href: "/store/concierge",
              icon: "🤝",
            },
            {
              label: "Cart",
              href: "/cart",
              icon: "🛒",
            },
          ]}
          openMenu={openMenu}
          setOpenMenu={setOpenMenu}
        />

        <Dropdown
          id="top-community"
          href="/forums?tab=community"
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
              Guest
            </a>



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

      <LiveScoreTicker />

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
              href="/get-em"
              className="cn-pickem-cta"
            >
              🏆 PICK 'EM — PLAY NOW
            </a>

            <a
              href="/live-sports"
              className="cn-live-cta"
            >
              📻 LISTEN LIVE — GAMEDAY ACTION
            </a>

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

          <p className="cn-community-slogan">
            Together, We Show What It Means To Be A Fan At The Next Level.
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

      <footer className="cn-site-footer">
        <div className="cn-site-footer-inner">
          <img
            src="/ngf-productions-logo.webp"
            alt="NGF Productions"
            className="cn-site-footer-logo"
          />

          <p className="cn-site-footer-production">
            NGF Productions
          </p>

          <p className="cn-site-footer-pending">
            Copyright Pending • © 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
