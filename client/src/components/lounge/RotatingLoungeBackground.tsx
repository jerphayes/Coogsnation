type LoungeBackgroundVariant =
  | "football"
  | "basketball"
  | "cougar";

const LOUNGE_BACKGROUNDS: Record<
  LoungeBackgroundVariant,
  string
> = {
  football: "/coogpaws/lounge/rotation/A.png",
  basketball: "/coogpaws/lounge/rotation/B.png",
  cougar: "/coogpaws/lounge/rotation/C.png",
};

export function RotatingLoungeBackground({
  variant = "cougar",
}: {
  variant?: LoungeBackgroundVariant;
}) {
  const source = LOUNGE_BACKGROUNDS[variant];

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-black"
      data-testid="lounge-background"
      data-lounge-variant={variant}
      aria-hidden="true"
    >
      <img
        src={source}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
        draggable={false}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/35" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_28%,rgba(0,0,0,.18)_65%,rgba(0,0,0,.58)_100%)]" />
    </div>
  );
}
