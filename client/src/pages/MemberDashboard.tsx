import { useEffect, useState } from "react";

export default function MemberDashboard() {
  const [user, setUser] = useState<{ username?: string; name?: string; email: string; password: string; avatar?: string } | null>(null);

  useEffect(() => {
    const current = localStorage.getItem("currentUser");
    if (!current) {
      window.location.href = "/login/other";
    } else {
      setUser(JSON.parse(current));
    }
  }, []);

  if (!user) {
    return (
      <div className="text-center mt-20 text-gray-700">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto mt-10 p-6 bg-white rounded-lg shadow" data-testid="card-dashboard">
      <div className="mb-6">
        <a 
          href="/" 
          className="inline-flex items-center text-red-600 hover:text-red-700 font-semibold"
          data-testid="link-home"
        >
          ← Home
        </a>
      </div>
      <h2 className="text-3xl font-bold text-center text-red-700 mb-6" data-testid="title-welcome">
        Welcome back, {user.username || user.email}!
      </h2>

      <p className="text-center text-gray-600 mb-6">
        Ready to Go Coogs! Here's what's happening in your community.
      </p>

      {/* Profile Completion Prompt for New Users */}
      <div className="mb-8 bg-white border-2 border-red-200 rounded-lg p-6 text-center">
        <h3 className="text-xl font-bold text-red-700 mb-2">
          👋 Complete Your Member Profile
        </h3>
        <p className="text-gray-700 mb-4">
          Add more details about yourself, upload an avatar, and connect with the CoogsNation community!
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a 
            href="/profile/local" 
            className="bg-white border-2 border-red-600 text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 font-semibold inline-flex items-center gap-2"
            data-testid="button-complete-profile"
          >
            <span>📝</span> Complete Your Profile
          </a>
          <a 
            href="/members" 
            className="bg-white border-2 border-red-600 text-red-600 px-6 py-3 rounded-lg hover:bg-red-50 font-semibold inline-flex items-center gap-2"
            data-testid="button-browse-members"
          >
            <span>👥</span> Browse Members
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-center">
        <div className="p-4 border rounded-lg shadow hover:shadow-md">
          <h3 className="text-xl font-semibold">Unread Messages</h3>
          <p className="text-4xl text-red-600 mt-2">0</p>
          <button 
            className="mt-3 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            data-testid="button-view-messages"
          >
            View Messages
          </button>
        </div>

        <div className="p-4 border rounded-lg shadow hover:shadow-md">
          <h3 className="text-xl font-semibold">Upcoming Events</h3>
          <p className="text-4xl text-green-600 mt-2">0</p>
          <button 
            className="mt-3 bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            data-testid="button-manage-events"
          >
            Manage Events
          </button>
        </div>

        <div className="p-4 border rounded-lg shadow hover:shadow-md">
          <h3 className="text-xl font-semibold">Community Members</h3>
          <p className="text-4xl text-purple-600 mt-2">2</p>
          <button 
            className="mt-3 bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
            data-testid="button-join-discussion"
          >
            Join Discussion
          </button>
        </div>
      </div>

      <div className="mt-12 border-t pt-6 text-center">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap justify-center gap-3">
          <button 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            data-testid="button-join-forum"
          >
            Join Forum Discussion
          </button>
          <button 
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            data-testid="button-create-event"
          >
            Create Event
          </button>
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            data-testid="button-shop-merchandise"
          >
            Shop Merchandise
          </button>
          <button 
            className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
            data-testid="button-send-message"
          >
            Send Message
          </button>
          <a 
            href="/profile/local"
            className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700 inline-block"
            style={{ textDecoration: 'none' }}
            data-testid="button-create-profile"
          >
            <span style={{ color: '#ffffff' }}>Create/Profile Page</span>
          </a>
        </div>
      </div>

      <div className="mt-12 text-center">
        <button
          className="text-sm text-red-500 hover:text-red-700 underline"
          data-testid="button-delete-membership"
          onClick={() => {
            if (confirm("Are you sure you want to delete your membership?")) {
              const allUsers = JSON.parse(localStorage.getItem("coogsnationUsers") || "[]");
              const filtered = allUsers.filter(
                (u: any) => u.email !== user.email && u.username !== user.username
              );
              localStorage.setItem("coogsnationUsers", JSON.stringify(filtered));
              localStorage.removeItem("currentUser");
              window.location.href = "/";
            }
          }}
        >
          Delete Membership
        </button>
      </div>
    </div>
  );
}
