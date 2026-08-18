import { useEffect } from "react";

export default function Community() {
  useEffect(() => {
    window.location.replace("/forums?tab=community");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-700">
      Opening CoogsNation Community…
    </div>
  );
}
