import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export function ActiveMembers() {
  const { data: members, isLoading } = useQuery({
    queryKey: ["/api/community/members/active"],
  });

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-uh-black mb-4 flex items-center">
        <i className="fas fa-user-friends text-uh-red mr-2"></i>
        Active Members
      </h3>
      <div className="space-y-3">
        {members && members.length > 0 ? (
          members.map((member: any) => (
            <div key={member.id} className="flex items-center space-x-3">
              <img 
                src={member.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop"} 
                alt={member.firstName || member.username || 'Member'}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-uh-black">
                    {member.username || member.firstName || 'Member'}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {member.lastActiveAt 
                      ? new Date(member.lastActiveAt).toLocaleDateString()
                      : 'Online'
                    }
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {member.title || 'Community Member'}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-gray-500">
            <p>No active members to display</p>
          </div>
        )}
      </div>
    </Card>
  );
}
