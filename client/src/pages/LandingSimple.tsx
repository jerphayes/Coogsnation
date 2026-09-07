import { useEffect, useState } from "react";
import bannerImage from "@assets/file_00000000881861f9be677e55822b57a5_1757784057972.png";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { forumCategoryPath, isVisibleForumCategory } from "@/lib/forumNavigation";

type MenuItem = {
  label: string;
  description?: string;
  href: string;
  icon?: string;
};

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

interface VictoryCelebrationState {
  enabled: boolean;
  houstonScore: number;
  opponentName: string;
  opponentScore: number;
  expiresAt: string;
}

export default function Landing() {
  const { isAuthenticated } = useAuth();

  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  const [victoryCelebration, setVictoryCelebration] =
    useState<VictoryCelebrationState | null>(null);

  const [forumCategoryLinks, setForumCategoryLinks] =
    useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    let expiryTimer: ReturnType<typeof setTimeout> | null = null;

    const clearExpiryTimer = () => {
      if (expiryTimer !== null) {
        clearTimeout(expiryTimer);
        expiryTimer = null;
      }
    };

    const refreshVictoryCelebration = async () => {
      try {
        const response = await fetch("/api/site/victory-celebration", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Victory celebration state unavailable");
        }

        const data = await response.json();

        const houstonScore = Number(data?.houstonScore);
        const opponentScore = Number(data?.opponentScore);
        const opponentName =
          typeof data?.opponentName === "string"
            ? data.opponentName.trim()
            : "";
        const expiresAt =
          typeof data?.expiresAt === "string"
            ? data.expiresAt
            : "";
        const expiresAtMs = Date.parse(expiresAt);

        const valid =
          data?.enabled === true &&
          Number.isInteger(houstonScore) &&
          houstonScore >= 0 &&
          houstonScore <= 999 &&
          Number.isInteger(opponentScore) &&
          opponentScore >= 0 &&
          opponentScore <= 999 &&
          opponentName.length > 0 &&
          Number.isFinite(expiresAtMs) &&
          expiresAtMs > Date.now();

        if (cancelled) return;

        clearExpiryTimer();

        if (!valid) {
          setVictoryCelebration(null);
          return;
        }

        setVictoryCelebration({
          enabled: true,
          houstonScore,
          opponentName,
          opponentScore,
          expiresAt,
        });

        expiryTimer = setTimeout(() => {
          if (!cancelled) {
            setVictoryCelebration(null);
          }
        }, Math.max(0, expiresAtMs - Date.now()));
      } catch {
        if (!cancelled) {
          clearExpiryTimer();
          setVictoryCelebration(null);
        }
      }
    };

    const handleFocus = () => {
      void refreshVictoryCelebration();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshVictoryCelebration();
      }
    };

    void refreshVictoryCelebration();

    const pollTimer = window.setInterval(() => {
      void refreshVictoryCelebration();
    }, 15_000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      clearExpiryTimer();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);




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
      href: "/intramurals",
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

        .cn-site-footer-card {
          display: block;
          width: min(380px, 90vw);
          margin: 0 auto 20px;
          padding: 16px 18px;
          border: 1px solid rgba(255,255,255,.22);
          border-radius: 14px;
          background: rgba(255,255,255,.05);
          color: #ffffff !important;
          text-decoration: none !important;
          box-shadow: 0 8px 24px rgba(0,0,0,.22);
          transition: transform .18s ease,
                      border-color .18s ease,
                      background .18s ease;
        }

        .cn-site-footer-card:hover {
          transform: translateY(-2px);
          border-color: #c8102e;
          background: rgba(255,255,255,.09);
        }

        .cn-site-footer-card:active {
          transform: translateY(0);
        }

        .cn-site-footer-logo {
          display: block;
          width: min(260px, 74vw);
          height: auto;
          margin: 0 auto;
          object-fit: contain;
        }

        .cn-site-footer-company {
          display: block;
          margin-top: 12px;
          color: #ffffff;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: .02em;
        }

        .cn-site-footer-more {
          display: block;
          margin-top: 7px;
          color: #ff8a9d;
          font-size: 14px;
          font-weight: 800;
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

        .cn-victory-hero {
          position: relative;
          min-height: 610px;
          overflow: hidden;
          background: #070d13;
          isolation: isolate;
          display: flex;
          align-items: stretch;
          justify-content: center;
        }

        .cn-victory-art {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          z-index: -3;
        }

        .cn-victory-shade {
          position: absolute;
          inset: 0;
          z-index: -2;
          background:
            linear-gradient(
              180deg,
              rgba(0, 0, 0, .08) 0%,
              rgba(0, 0, 0, .02) 48%,
              rgba(0, 0, 0, .72) 100%
            );
          pointer-events: none;
        }

        .cn-victory-score-wrap {
          width: 100%;
          min-height: 610px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          padding: 36px 24px 42px;
          color: #fff;
          text-align: center;
        }

        .cn-victory-scoreboard {
          width: min(760px, calc(100vw - 40px));
          padding: 18px 24px 22px;
          border: 1px solid rgba(255,255,255,.42);
          border-radius: 18px;
          background: rgba(3, 7, 12, .82);
          box-shadow:
            0 18px 50px rgba(0,0,0,.42),
            inset 0 1px 0 rgba(255,255,255,.14);
          backdrop-filter: blur(8px);
        }

        .cn-victory-final {
          margin-bottom: 12px;
          font-size: 15px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: .22em;
          color: #fff;
        }

        .cn-victory-matchup {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 22px;
        }

        .cn-victory-team {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          min-width: 0;
        }

        .cn-victory-team-name {
          overflow: hidden;
          font-size: clamp(18px, 2.3vw, 30px);
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: .03em;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cn-victory-team-score {
          flex: 0 0 auto;
          font-size: clamp(42px, 6vw, 72px);
          line-height: .9;
          font-weight: 950;
          font-variant-numeric: tabular-nums;
        }

        .cn-victory-divider {
          width: 1px;
          height: 58px;
          background: rgba(255,255,255,.35);
        }

        @media (max-width: 700px) {
          .cn-victory-hero,
          .cn-victory-score-wrap {
            min-height: 560px;
          }

          .cn-victory-art {
            object-fit: cover;
            object-position: center;
          }

          .cn-victory-score-wrap {
            padding: 24px 14px 28px;
          }

          .cn-victory-scoreboard {
            width: 100%;
            padding: 15px 14px 18px;
            border-radius: 14px;
          }

          .cn-victory-matchup {
            grid-template-columns: 1fr;
            gap: 9px;
          }

          .cn-victory-divider {
            width: 100%;
            height: 1px;
          }

          .cn-victory-team {
            width: 100%;
          }

          .cn-victory-team-name {
            font-size: clamp(17px, 5.2vw, 24px);
          }

          .cn-victory-team-score {
            font-size: clamp(40px, 13vw, 58px);
          }
        }


        .cn-victory-score-wrap{
          width:100%;
          min-height:610px;
          position:relative;
          display:block;
          padding:0;
          text-align:center;
        }
        .cn-victory-scoreboard{
          position:absolute;
          top:20px;
          left:58%;
          width:min(320px,30vw);
          padding:10px 14px 12px;
          border-radius:12px;
        }
        .cn-victory-final{
          margin-bottom:7px;
          font-size:12px;
          text-align:center;
        }
        .cn-victory-matchup{
          grid-template-columns:1fr auto 1fr;
          gap:12px;
        }
        .cn-victory-team{
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:3px;
          text-align:center;
        }
        .cn-victory-team-name{
          max-width:100%;
          font-size:13px;
          text-align:center;
        }
        .cn-victory-team-score{
          font-size:30px;
          line-height:.95;
          text-align:center;
        }
        .cn-victory-divider{
          height:42px;
        }
        @media(max-width:1100px){
          .cn-victory-scoreboard{
            left:auto;
            right:18px;
            width:min(310px,38vw);
          }
        }
        @media(max-width:820px){
          .cn-victory-scoreboard{
            top:auto;
            left:50%;
            right:auto;
            bottom:20px;
            width:min(320px,calc(100vw - 24px));
            padding:10px 12px 12px;
            transform:translateX(-50%);
          }
          .cn-victory-team-name{font-size:12px}
          .cn-victory-team-score{font-size:26px}
          .cn-victory-divider{width:1px;height:36px}
        }

        /* FINAL VICTORY RESPONSIVE OVERRIDES */

        /* Desktop: preserve top of artwork / CELEBRATION lettering */
        .cn-victory-art{
          object-fit:cover;
          object-position:center top;
        }

        .cn-victory-scoreboard{
          top:22px;
          left:58%;
          width:min(320px,30vw);
        }

        /* Mobile */
        @media(max-width:820px){

          .cn-victory-hero{
            min-height:360px;
            background:#070d13;
          }

          /* Fill the phone hero behind the complete foreground artwork */
          .cn-victory-hero::before{
            content:"";
            position:absolute;
            inset:0;
            z-index:-4;
            background-image:url("/coog-victory-celebration.gif");
            background-size:cover;
            background-position:center top;
            filter:blur(8px) brightness(.55);
            transform:scale(1.05);
          }

          /* Show the COMPLETE victory artwork on mobile */
          .cn-victory-art{
            width:100%;
            height:auto;
            max-height:none;
            object-fit:contain;
            object-position:center top;
            inset:0 auto auto 0;
          }

          .cn-victory-score-wrap{
            min-height:360px;
            padding:0;
          }

          /* Compact horizontal FINAL box below the full wording */
          .cn-victory-scoreboard{
            top:calc(32vw + 14px);
            bottom:auto;
            left:50%;
            right:auto;
            width:min(300px,calc(100vw - 28px));
            padding:8px 10px 9px;
            border-radius:10px;
            transform:translateX(-50%);
          }

          .cn-victory-final{
            margin-bottom:6px;
            font-size:10px;
            line-height:1;
            letter-spacing:.18em;
          }

          .cn-victory-matchup{
            display:grid;
            grid-template-columns:1fr auto 1fr;
            align-items:center;
            gap:8px;
          }

          .cn-victory-team{
            width:auto;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:2px;
            text-align:center;
          }

          .cn-victory-team-name{
            max-width:115px;
            font-size:11px;
            line-height:1.05;
            text-align:center;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          }

          .cn-victory-team-score{
            font-size:24px;
            line-height:.95;
            text-align:center;
          }

          .cn-victory-divider{
            width:1px;
            height:34px;
          }
        }

        @media(max-width:420px){
          .cn-victory-hero,
          .cn-victory-score-wrap{
            min-height:330px;
          }

          .cn-victory-scoreboard{
            top:calc(32vw + 12px);
            width:min(286px,calc(100vw - 22px));
          }

          .cn-victory-team-name{
            font-size:10px;
            max-width:105px;
          }

          .cn-victory-team-score{
            font-size:22px;
          }
        }

        /* END FINAL VICTORY RESPONSIVE OVERRIDES */


        /* MOBILE VICTORY SCORE — compact, right of CELEBRATION */
        @media(max-width:820px){

          .cn-victory-score-wrap{
            min-height:360px;
            position:relative;
            padding:0;
          }

          .cn-victory-scoreboard{
            position:absolute;
            top:clamp(72px,20vw,96px);
            right:10px;
            bottom:auto;
            left:auto;
            transform:none;

            width:150px;
            padding:6px 7px 7px;

            border-radius:8px;
            background:rgba(3,7,12,.84);
          }

          .cn-victory-final{
            margin:0 0 4px;
            font-size:8px;
            line-height:1;
            letter-spacing:.16em;
            text-align:center;
          }

          .cn-victory-matchup{
            display:grid;
            grid-template-columns:1fr auto 1fr;
            align-items:center;
            gap:5px;
          }

          .cn-victory-team{
            width:auto;
            min-width:0;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:1px;
          }

          .cn-victory-team-name{
            max-width:58px;
            font-size:8px;
            line-height:1;
            letter-spacing:0;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            text-align:center;
          }

          .cn-victory-team-score{
            font-size:18px;
            line-height:.95;
            text-align:center;
          }

          .cn-victory-divider{
            width:1px;
            height:27px;
          }
        }

        @media(max-width:420px){
          .cn-victory-scoreboard{
            top:clamp(68px,19vw,84px);
            right:7px;
            width:142px;
            padding:5px 6px 6px;
          }

          .cn-victory-team-name{
            max-width:54px;
            font-size:7.5px;
          }

          .cn-victory-team-score{
            font-size:17px;
          }
        }


        /* FINAL DESKTOP / TABLET VICTORY LAYOUT */
        @media(min-width:768px){

          .cn-victory-hero{
            min-height:610px;
            overflow:hidden;
          }

          .cn-victory-art{
            position:absolute;
            inset:0;
            width:100%;
            height:100%;
            max-height:none;
            object-fit:cover !important;

            /*
             * Preserve the CELEBRATION composition.
             * Slightly above center reveals the lettering
             * without exposing the full COOG VICTORY artwork.
             */
            object-position:center 46% !important;

            transform:none !important;
          }

          .cn-victory-score-wrap{
            width:100%;
            min-height:610px;
            position:relative;
            display:block;
            padding:0;
          }

          .cn-victory-scoreboard{
            position:absolute !important;

            top:20px !important;
            left:58% !important;
            right:auto !important;
            bottom:auto !important;

            width:320px !important;
            max-width:30vw;

            padding:10px 14px 12px !important;
            border-radius:12px;

            transform:none !important;

            background:rgba(3,7,12,.84);
          }

          .cn-victory-final{
            margin:0 0 7px;
            font-size:12px;
            line-height:1;
            letter-spacing:.18em;
            text-align:center;
          }

          .cn-victory-matchup{
            display:grid !important;
            grid-template-columns:1fr auto 1fr !important;
            align-items:center;
            gap:12px !important;
          }

          .cn-victory-team{
            width:auto !important;
            min-width:0;
            display:flex;
            flex-direction:column !important;
            align-items:center !important;
            justify-content:center;
            gap:3px;
            text-align:center;
          }

          .cn-victory-team-name{
            max-width:120px;
            font-size:13px !important;
            line-height:1.05;
            text-align:center;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          }

          .cn-victory-team-score{
            font-size:30px !important;
            line-height:.95;
            text-align:center;
          }

          .cn-victory-divider{
            width:1px !important;
            height:42px !important;
          }
        }

        /* Tablet / narrower browser */
        @media(min-width:768px) and (max-width:1100px){

          .cn-victory-scoreboard{
            left:auto !important;
            right:18px !important;
            width:290px !important;
            max-width:38vw;
          }

          .cn-victory-team-name{
            font-size:12px !important;
            max-width:105px;
          }

          .cn-victory-team-score{
            font-size:27px !important;
          }
        }


        /* MOBILE ONLY: victory score lives in header below ticker */
        @media(max-width:767px){

          /* Remove the old hero score box on phones only */
          .cn-victory-scoreboard{
            display:none !important;
          }

          .cn-mobile-header-score{
            width:176px;
            padding:4px 7px 5px;
            border:1px solid rgba(255,255,255,.36);
            border-radius:7px;
            background:rgba(3,7,12,.92);
            color:#fff;
            box-shadow:0 4px 12px rgba(0,0,0,.35);
            text-align:center;
          }

          .cn-mobile-header-final{
            margin-bottom:3px;
            font-size:7px;
            line-height:1;
            font-weight:900;
            letter-spacing:.16em;
          }

          .cn-mobile-header-matchup{
            display:grid;
            grid-template-columns:1fr 1px 1fr;
            align-items:center;
            gap:5px;
          }

          .cn-mobile-header-matchup > div{
            min-width:0;
            display:flex;
            align-items:center;
            justify-content:center;
            gap:4px;
          }

          .cn-mobile-header-matchup span{
            overflow:hidden;
            max-width:52px;
            font-size:7px;
            line-height:1;
            font-weight:900;
            white-space:nowrap;
            text-overflow:ellipsis;
          }

          .cn-mobile-header-matchup strong{
            font-size:15px;
            line-height:1;
            font-weight:950;
          }

          .cn-mobile-header-matchup i{
            width:1px;
            height:19px;
            background:rgba(255,255,255,.34);
          }
        }

        @media(min-width:768px){
          .cn-mobile-header-score{
            display:none !important;
          }
        }

        /* CANONICAL HEADER SCORE */
        .cn-victory-scoreboard{display:none!important}
        .cn-header-score{width:max-content;max-width:calc(100vw - 150px);padding:0;border:0;background:transparent;box-shadow:none;color:#fff;text-align:center;white-space:nowrap}
        .cn-header-final{margin:0 0 3px;font-size:7px;line-height:1;font-weight:900;letter-spacing:.17em;text-align:center}
        .cn-header-matchup{display:flex;align-items:center;justify-content:center;gap:5px}
        .cn-header-matchup>div{min-width:0;display:flex;align-items:center;justify-content:center;gap:4px}
        .cn-header-matchup span{overflow:hidden;max-width:84px;font-size:15px;line-height:1;font-weight:900;white-space:nowrap;text-overflow:ellipsis}
        .cn-header-matchup strong{font-size:15px;line-height:1;font-weight:950;font-variant-numeric:tabular-nums}
        .cn-header-matchup i{display:block;width:1px;height:18px;background:rgba(255,255,255,.42)}
        .cn-header-score.is-uh-win .cn-header-matchup strong{color:#c8102e}
        .cn-header-score.is-uh-loss .cn-header-matchup strong{color:#fff}
        @media(min-width:768px){.cn-header-final{font-size:8px}.cn-header-matchup{gap:7px}.cn-header-matchup span{max-width:120px;font-size:17px}.cn-header-matchup strong{font-size:17px}.cn-header-matchup i{height:21px}}
        @media(min-width:1024px){.cn-header-matchup span{font-size:18px}.cn-header-matchup strong{font-size:18px}}
        @media(min-width:1280px){.cn-header-score{max-width:420px}.cn-header-final{font-size:9px}.cn-header-matchup span{max-width:140px;font-size:19px}.cn-header-matchup strong{font-size:19px}.cn-header-matchup i{height:23px}}

        /* FINAL MOBILE-GUIDED PAGE COMPOSITION */

        @media(min-width:768px){

          .cn-victory-hero{
            height:clamp(580px,44vw,720px)!important;
            min-height:0!important;
            margin:0!important;
            border:0!important;
            overflow:hidden!important;
            background:#070d13!important;
          }

          .cn-victory-hero::before{
            content:"";
            position:absolute;
            inset:-20px;
            z-index:-4;
            background-image:url("/coog-victory-celebration.gif");
            background-size:cover;
            background-position:center;
            filter:blur(14px) brightness(.42);
            transform:scale(1.05);
          }

          .cn-victory-art{
            position:absolute!important;
            inset:0!important;
            width:100%!important;
            height:100%!important;
            max-height:none!important;
            object-fit:contain!important;
            object-position:center center!important;
            transform:none!important;
          }

          .cn-victory-shade{
            background:linear-gradient(
              180deg,
              rgba(0,0,0,.02) 0%,
              rgba(0,0,0,.01) 80%,
              rgba(0,0,0,.12) 100%
            )!important;
          }

          .cn-feature-section{
            padding:12px 24px 24px!important;
            border-top:0!important;
          }

          .cn-feature-heading{
            margin:0 auto 10px!important;
          }

          .cn-feature-heading h2{
            margin:0 0 4px!important;
            font-size:clamp(24px,2.3vw,34px)!important;
          }

          .cn-feature-heading p{
            margin:0!important;
          }

          .cn-feature-grid{
            margin-top:8px!important;
          }
        }

        @media(min-width:768px) and (max-width:1023px){
          .cn-victory-hero{
            height:clamp(560px,72vw,680px)!important;
          }

          .cn-feature-section{
            padding-top:10px!important;
          }
        }

      `}</style>

      <Header
        centerScore={
          victoryCelebration ? (
            <div className={`cn-header-score ${victoryCelebration.houstonScore > victoryCelebration.opponentScore ? "is-uh-win" : "is-uh-loss"}`} aria-live="polite">
              <div className="cn-header-final">FINAL</div>

              <div className="cn-header-matchup">
                <div>
                  <span>HOUSTON</span>
                  <strong>{victoryCelebration.houstonScore}</strong>
                </div>

                <i aria-hidden="true" />

                <div>
                  <span>{victoryCelebration.opponentName.toUpperCase()}</span>
                  <strong>{victoryCelebration.opponentScore}</strong>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      {victoryCelebration ? (
        <section
          className="cn-victory-hero"
          aria-label="Coog Victory Celebration"
        >
          <img
            src="/coog-victory-celebration.gif"
            alt="Coog Victory Celebration"
            className="cn-victory-art"
          />

          <div
            className="cn-victory-shade"
            aria-hidden="true"
          />

          <div className="cn-victory-score-wrap">
            <div
              className="cn-victory-scoreboard"
              aria-live="polite"
            >
              <div className="cn-victory-final">
                FINAL
              </div>

              <div className="cn-victory-matchup">
                <div className="cn-victory-team">
                  <span className="cn-victory-team-name">
                    HOUSTON
                  </span>
                  <strong className="cn-victory-team-score">
                    {victoryCelebration.houstonScore}
                  </strong>
                </div>

                <div
                  className="cn-victory-divider"
                  aria-hidden="true"
                />

                <div className="cn-victory-team">
                  <span className="cn-victory-team-name">
                    {victoryCelebration.opponentName.toUpperCase()}
                  </span>
                  <strong className="cn-victory-team-score">
                    {victoryCelebration.opponentScore}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
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
      )}

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
          <a
            href="https://ngf.llc"
            target="_blank"
            rel="noopener noreferrer"
            className="cn-site-footer-card"
            aria-label="Learn more about NGF Productions LLC"
          >
            <img
              src="/ngf-productions-logo.webp"
              alt="NGF Productions LLC"
              className="cn-site-footer-logo"
            />

            <span className="cn-site-footer-company">
              NGF Productions LLC
            </span>

            <span className="cn-site-footer-more">
              Learn more about NGF Productions LLC →
            </span>
          </a>

          <p className="cn-site-footer-production">
            © 2026 NGF Productions LLC. All rights reserved.
          </p>

          <p className="cn-site-footer-pending">
            CoogsNation is an independent fan site owned and operated by NGF Productions LLC and is not affiliated with, endorsed by, sponsored by, or officially connected with the University of Houston.
          </p>
        </div>
      </footer>
    </div>
  );
}
