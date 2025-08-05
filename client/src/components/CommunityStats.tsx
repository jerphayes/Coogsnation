import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export function CommunityStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/community/stats"],
  });

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-uh-black mb-4 flex items-center">
        <i className="fas fa-chart-line text-uh-red mr-2"></i>
        Community Stats
      </h3>
      <div className="space-y-4">
        {stats ? (
          <>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Members</span>
              <span className="font-bold text-uh-black">{stats.totalMembers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Online Now</span>
              <span className="font-bold text-green-600">{stats.onlineMembers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Posts Today</span>
              <span className="font-bold text-uh-black">{stats.postsToday.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">New Members</span>
              <span className="font-bold text-blue-600">{stats.newMembersToday.toLocaleString()}</span>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>Unable to load stats</p>
          </div>
        )}
      </div>
    </Card>
  );
}
