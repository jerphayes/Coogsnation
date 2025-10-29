import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SessionTest() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [localUser, setLocalUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      setLocalUser(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-red-700">🔍 Session Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Backend Auth Status */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-bold text-blue-900 mb-3">Backend Authentication (OAuth)</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold">Loading:</span> {isLoading ? "Yes" : "No"}</p>
                  <p><span className="font-semibold">Authenticated:</span> {isAuthenticated ? "✅ Yes" : "❌ No"}</p>
                  {user && (
                    <>
                      <p><span className="font-semibold">User ID:</span> {(user as any).id}</p>
                      <p><span className="font-semibold">Email:</span> {(user as any).email}</p>
                      <p><span className="font-semibold">Username:</span> {(user as any).username || "(not set)"}</p>
                      <p><span className="font-semibold">Display Name:</span> {(user as any).displayName || "(not set)"}</p>
                    </>
                  )}
                  {!user && !isLoading && (
                    <p className="text-red-600 font-semibold">No backend session found</p>
                  )}
                </div>
              </div>

              {/* LocalStorage Auth Status */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h3 className="font-bold text-yellow-900 mb-3">LocalStorage Demo Auth</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-semibold">Has Local User:</span> {localUser ? "✅ Yes" : "❌ No"}</p>
                  {localUser && (
                    <>
                      <p><span className="font-semibold">Username:</span> {localUser.username || "(not set)"}</p>
                      <p><span className="font-semibold">Email:</span> {localUser.email || "(not set)"}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <h3 className="font-bold text-green-900 mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {isAuthenticated && (
                    <>
                      <a href="/dashboard" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        Go to Dashboard
                      </a>
                      <a href="/profile/advanced" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        View Profile
                      </a>
                      <a href="/forums" className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                        Browse Forums
                      </a>
                    </>
                  )}
                  {!isAuthenticated && !isLoading && (
                    <>
                      <a href="/login" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        Login with OAuth
                      </a>
                      <a href="/join" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Create Demo Account
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Raw Data */}
              <div className="p-4 bg-gray-100 border border-gray-300 rounded">
                <h3 className="font-bold text-gray-900 mb-3">Raw Data (for debugging)</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-sm mb-1">Backend User Object:</p>
                    <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(user, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1">LocalStorage User Object:</p>
                    <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(localUser, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
