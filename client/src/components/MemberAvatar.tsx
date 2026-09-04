import { useQuery } from "@tanstack/react-query";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { cn } from "@/lib/utils";

export type MemberIdentityLike = {
  id?: string | null;
  userId?: string | null;
  user_id?: string | null;

  firstName?: string | null;
  lastName?: string | null;

  displayName?: string | null;
  display_name?: string | null;

  handle?: string | null;
  username?: string | null;

  profileImageUrl?: string | null;
  profile_image_url?: string | null;

  avatarUrl?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;

  defaultAvatarChoice?: number | null;
  default_avatar_choice?: number | null;
};

type Props = {
  member?: MemberIdentityLike | null;
  userId?: string | null;
  displayName?: string | null;
  className?: string;
  fallbackClassName?: string;
  alt?: string;
};

const BUILT_IN_AVATARS: Record<number, string> = {
  1: "🐾",
  2: "🔥",
  3: "🎓",
  4: "🏈",
  5: "🎉",
};

function imageUrl(
  member?: MemberIdentityLike | null,
): string {
  return (
    member?.profileImageUrl ||
    member?.profile_image_url ||
    member?.avatarUrl ||
    member?.avatar_url ||
    member?.avatar ||
    ""
  );
}

function defaultChoice(
  member?: MemberIdentityLike | null,
): number | null {
  const value =
    member?.defaultAvatarChoice ??
    member?.default_avatar_choice;

  return typeof value === "number"
    ? value
    : null;
}

function identityName(
  member?: MemberIdentityLike | null,
  explicit?: string | null,
): string {
  const fullName = [
    member?.firstName,
    member?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    member?.displayName ||
    member?.display_name ||
    fullName ||
    member?.handle ||
    member?.username ||
    explicit ||
    "CoogsNation Member"
  );
}

function initials(value: string): string {
  const pieces = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (pieces.length >= 2) {
    return (
      `${pieces[0][0] || ""}${pieces[1][0] || ""}`
    ).toUpperCase();
  }

  return (
    value.replace(/^@/, "").slice(0, 2) || "CN"
  ).toUpperCase();
}

export default function MemberAvatar({
  member,
  userId,
  displayName,
  className,
  fallbackClassName,
  alt,
}: Props) {
  const resolvedUserId =
    userId ||
    member?.id ||
    member?.userId ||
    member?.user_id ||
    null;

  const directImage = imageUrl(member);
  const directChoice = defaultChoice(member);

  /*
   * MEMBER_AVATAR_CANONICAL_IDENTITY_V1
   *
   * When a surface only knows a user ID (forums, lounge,
   * messages, rosters, etc.), resolve the same public member
   * identity through one endpoint. React Query caches by user ID,
   * so repeated appearances do not create independent identity
   * state.
   */
  const {
    data: remoteIdentity,
    isLoading: identityLoading,
  } = useQuery<MemberIdentityLike>({
      queryKey: [
        resolvedUserId
          ? `/api/community/members/${resolvedUserId}/identity`
          : "/api/community/members/no-identity",
      ],
      enabled:
        Boolean(resolvedUserId) &&
        !directImage &&
        !directChoice,
      staleTime: 5 * 60 * 1000,
    });

  const finalImage =
    directImage ||
    imageUrl(remoteIdentity);

  const finalChoice =
    directChoice ??
    defaultChoice(remoteIdentity);

  const finalName =
    identityName(
      remoteIdentity || member,
      displayName,
    );

  const builtInAvatar =
    finalChoice
      ? BUILT_IN_AVATARS[finalChoice]
      : null;

  /*
   * MEMBER_AVATAR_NO_FALLBACK_FLASH_V1
   *
   * Initials are a true fallback, not a loading indicator.
   * Do not flash CM/JH while the canonical identity is resolving.
   */
  const waitingForIdentity =
    Boolean(resolvedUserId) &&
    !directImage &&
    !directChoice &&
    !remoteIdentity &&
    identityLoading;

  if (waitingForIdentity) {
    return (
      <div
        className={cn(
          "h-10 w-10 shrink-0 animate-pulse rounded-full bg-white/10",
          className,
        )}
        aria-label="Loading member avatar"
      />
    );
  }

  return (
    <Avatar
      className={cn(
        "h-10 w-10 shrink-0",
        className,
      )}
    >
      {finalImage ? (
        <>
          <AvatarImage
            src={finalImage}
            alt={alt || `${finalName} avatar`}
            className="object-cover"
          />

          {/*
           * MEMBER_AVATAR_IMAGE_LOADING_PLACEHOLDER_V1
           *
           * A real avatar exists. Never flash initials while the
           * image is downloading/decoding.
           */}
          <AvatarFallback
            className="bg-white/10"
            aria-hidden="true"
          />
        </>
      ) : (
        <AvatarFallback
          className={cn(
            "bg-red-700 font-black text-white",
            fallbackClassName,
          )}
        >
          {builtInAvatar || initials(finalName)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
