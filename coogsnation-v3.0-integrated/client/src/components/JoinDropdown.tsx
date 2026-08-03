import { useState } from "react";

export default function JoinDropdown() {
  const [open, setOpen] = useState(false);
  const items = [
    { text: "🔑 Login", href: "/login", color: "text-red-700 font-bold hover:bg-red-50" },
    { text: "📝 Create Account", href: "/signup", color: "text-red-600 font-bold hover:bg-red-50" },
    { text: "👤 Continue as Guest", href: "/forums", color: "text-gray-600 hover:bg-gray-100" },
  ];

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((value) => !value)}
        className="px-3 py-2 bg-black text-white font-semibold rounded-md hover:bg-gray-800"
        data-testid="button-join"
      >
        Join ▾
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`block px-4 py-2 text-sm ${item.color}`}
                data-testid={`link-${item.text.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {item.text}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
