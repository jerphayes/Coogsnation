import { useEffect } from "react";
import { useLocation } from "wouter";

/*
 * Normal CoogsNation pages must remain scrollable.
 *
 * Clears stale body/html scroll locks left behind by menus,
 * sheets or dialogs after navigation.
 *
 * Immersive venue pages are intentionally exempt.
 */
export default function PageScrollRecovery() {
  const [location] = useLocation();

  useEffect(() => {
    const immersive =
      location === "/venues" ||
      location.startsWith("/venues/") ||
      location.startsWith("/venue/");

    if (immersive) {
      return;
    }

    const restore = () => {
      const openDialog =
        document.querySelector(
          '[role="dialog"][data-state="open"],' +
          '[data-vaul-drawer][data-state="open"]',
        );

      if (openDialog) {
        return;
      }

      const html =
        document.documentElement;

      const body =
        document.body;

      html.style.removeProperty("overflow");
      html.style.removeProperty("overflow-y");

      body.style.removeProperty("overflow");
      body.style.removeProperty("overflow-y");
      body.style.removeProperty("pointer-events");

      body.removeAttribute(
        "data-scroll-locked",
      );

      html.style.overflowX =
        "hidden";

      html.style.overflowY =
        "auto";

      body.style.overflowX =
        "hidden";

      body.style.overflowY =
        "auto";
    };

    restore();

    const frame =
      requestAnimationFrame(restore);

    const timer1 =
      window.setTimeout(
        restore,
        50,
      );

    const timer2 =
      window.setTimeout(
        restore,
        250,
      );

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [location]);

  return null;
}
