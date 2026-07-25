import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AchievementLevel, achievementLevels, getNextAchievement } from "@shared/schema";

interface AchievementBadgeProps {
  level: AchievementLevel;
  postCount?: number;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Badge color and icon mapping for each achievement level
const badgeConfig: Record<AchievementLevel, { color: string; icon: string; bgClass: string }> = {
  "Rookie": { color: "bg-gray-500", icon: "🔰", bgClass: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  "Bronze Star": { color: "bg-amber-600", icon: "⭐", bgClass: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  "Silver Star": { color: "bg-gray-400", icon: "⭐", bgClass: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  "Gold Star": { color: "bg-yellow-500", icon: "⭐", bgClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  "Diamond Star": { color: "bg-blue-500", icon: "💎", bgClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  "Platinum Member": { color: "bg-indigo-500", icon: "💠", bgClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  "MVP Status": { color: "bg-purple-500", icon: "🏆", bgClass: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  "Captain of the Team": { color: "bg-red-600", icon: "👑", bgClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  "Heisman": { color: "bg-orange-500", icon: "🏅", bgClass: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  "Grad Asst Coach": { color: "bg-green-600", icon: "🎓", bgClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  "Assistant Coach": { color: "bg-teal-600", icon: "📋", bgClass: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
  "Head Coach": { color: "bg-gradient-to-r from-red-600 to-red-700", icon: "🏆", bgClass: "bg-gradient-to-r from-red-100 to-red-200 text-red-900 dark:from-red-900 dark:to-red-800 dark:text-red-100" },
};

const sizeClasses = {
  sm: "text-xs px-2 py-1",
  md: "text-sm px-3 py-1.5",
  lg: "text-base px-4 py-2",
};

export function AchievementBadge({ 
  level, 
  postCount, 
  showProgress = false, 
  size = "md", 
  className = "" 
}: AchievementBadgeProps) {
  const config = badgeConfig[level];
  const currentAchievement = achievementLevels.find(a => a.level === level);
  
  const tooltipContent = (
    <div className="text-center">
      <div className="font-semibold">{config.icon} {level}</div>
      <div className="text-xs text-muted-foreground mt-1">
        {currentAchievement?.description}
      </div>
      {showProgress && postCount !== undefined && (
        <div className="text-xs mt-2">
          <div>Posts: {postCount}</div>
          {(() => {
            const nextInfo = getNextAchievement(postCount);
            if (nextInfo.nextLevel) {
              return (
                <div className="text-muted-foreground">
                  {nextInfo.postsNeeded} more for {nextInfo.nextLevel}
                </div>
              );
            }
            return <div className="text-green-600">Max level reached! 🎉</div>;
          })()}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`${config.bgClass} ${sizeClasses[size]} ${className} font-medium border-0 hover:opacity-80 transition-opacity`}
            data-testid={`badge-achievement-${level.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span className="mr-1">{config.icon}</span>
            {level}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for forum posts and smaller spaces
export function CompactAchievementBadge({ 
  level, 
  postCount, 
  className = "" 
}: Pick<AchievementBadgeProps, 'level' | 'postCount' | 'className'>) {
  const config = badgeConfig[level];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${config.bgClass} ${className}`}
            data-testid={`compact-badge-${level.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {config.icon}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <div className="font-semibold">{level}</div>
            {postCount !== undefined && (
              <div className="text-xs text-muted-foreground">
                {postCount} posts
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}