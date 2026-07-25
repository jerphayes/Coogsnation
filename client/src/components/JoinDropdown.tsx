import { useState } from "react";

export default function JoinDropdown() {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(!open);

  const items = [
    { text: "🔑 Login to Site", href: "/login/other", color: "text-red-700 font-bold hover:bg-red-50" },
    { text: "📝 Sign Up", href: "/signup", color: "text-red-600 font-bold hover:bg-red-50" },
    { text: "Continue with Google", href: "/auth/google", color: "text-red-500 hover:bg-red-50" },
    { text: "Continue with Apple", href: "/auth/apple", color: "text-gray-800 hover:bg-gray-100" },
    { text: "Continue with LinkedIn", href: "/auth/linkedin", color: "text-blue-600 hover:bg-blue-50" },
    { text: "Continue with Facebook", href: "/auth/facebook", color: "text-blue-500 hover:bg-blue-50" },
    { text: "Continue with X (Twitter)", href: "/auth/x", color: "text-sky-500 hover:bg-sky-50" },
    { text: "Continue with Other", href: "/signup/other", color: "text-gray-600 hover:bg-gray-100" },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={toggle}
        className="px-3 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800"
        data-testid="button-join"
      >
        Join ▾
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {items.map((i) => (
              <a key={i.href} href={i.href} className={`block px-4 py-2 text-sm ${i.color}`} data-testid={`link-${i.text.toLowerCase().replace(/\s+/g, '-')}`}>
                {i.text}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
