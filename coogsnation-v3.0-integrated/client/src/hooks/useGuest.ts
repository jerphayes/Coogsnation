import { useState, useEffect } from "react";

export function useGuest() {
  const [isGuestMode, setIsGuestMode] = useState(false);

  useEffect(() => {
    const guestMode = localStorage.getItem("guestMode");
    setIsGuestMode(guestMode === "true");
  }, []);

  const enableGuestMode = () => {
    localStorage.setItem("guestMode", "true");
    setIsGuestMode(true);
  };

  const disableGuestMode = () => {
    localStorage.removeItem("guestMode");
    setIsGuestMode(false);
  };

  return {
    isGuestMode,
    enableGuestMode,
    disableGuestMode,
  };
}
