import { useEffect, useState } from "react";

export default function ProfileDisplay() {
  const [profile, setProfile] = useState<{ handle: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then(res => res.json())
      .then(data => setProfile(data));
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt="Profile Avatar"
          className="w-24 h-24 rounded-full object-cover border"
          data-testid="img-avatar"
        />
      ) : (
        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
          No Avatar
        </div>
      )}
      <h2 className="text-lg font-semibold" data-testid="text-handle">@{profile?.handle}</h2>
    </div>
  );
}
