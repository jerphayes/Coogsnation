import { useEffect } from "react";

function safeCloseHref(explicit?: string): string {
  if (
    explicit &&
    explicit.startsWith("/") &&
    !explicit.startsWith("//")
  ) {
    return explicit;
  }

  if (typeof window !== "undefined") {
    const returnTo = new URLSearchParams(
      window.location.search,
    ).get("returnTo");

    if (
      returnTo &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//")
    ) {
      return returnTo;
    }
  }

  return "/";
}

export default function PageCardClose({
  href,
}: {
  href?: string;
}) {
  const closeHref = safeCloseHref(href);

  function close() {
    window.location.href = closeHref;
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (
        document.querySelector(
          '[role="dialog"]',
        )
      ) {
        return;
      }

      event.preventDefault();
      close();
    }

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
    };
  }, [closeHref]);

  return (
    <button
      type="button"
      data-ngf-page-card-close="true"
      aria-label="Close"
      title="Close"
      onClick={close}
      className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-2xl font-black leading-none text-gray-900 shadow-sm transition hover:bg-red-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
    >
      ×
    </button>
  );
}
