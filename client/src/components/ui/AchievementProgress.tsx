import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AchievementLevel, achievementLevels, getNextAchievement } from "@shared/schema";
import { AchievementBadge } from "./AchievementBadge";

interface AchievementProgressProps {
  currentLevel: AchievementLevel;
  postCount: number;
  className?: string;
}

export function AchievementProgress({ 
  currentLevel, 
  postCount, 
  className = "" 
}: AchievementProgressProps) {
  const nextInfo = getNextAchievement(postCount);
  const currentAchievement = achievementLevels.find(a => a.level === currentLevel);
  
  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!nextInfo.nextLevel) return 100; // Max level reached
    
    const currentThreshold = currentAchievement?.threshold || 0;
    const nextThreshold = achievementLevels.find(a => a.level === nextInfo.nextLevel)?.threshold || 0;
    const progress = ((postCount - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    
    return Math.max(0, Math.min(100, progress));
  };

  const progressPercentage = getProgressPercentage();

  return (
    <Card className={`${className}`} data-testid="achievement-progress-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span>Achievement Progress</span>
        </CardTitle>
        <CardDescription>
          Your current status in the community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <AchievementBadge 
            level={currentLevel} 
            postCount={postCount} 
            showProgress={false}
            size="lg"
            data-testid="current-achievement-badge"
          />
          <div className="text-right text-sm text-muted-foreground">
            <div className="font-medium">{postCount} posts</div>
            <div>{currentAchievement?.description}</div>
          </div>
        </div>

        {nextInfo.nextLevel ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress to {nextInfo.nextLevel}</span>
              <span className="text-muted-foreground">
                {nextInfo.postsNeeded} more posts needed
              </span>
            </div>
            
            <Progress 
              value={progressPercentage} 
              className="h-3"
              data-testid="achievement-progress-bar"
            />
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{currentAchievement?.threshold || 0}</span>
              <span className="font-medium">
                {achievementLevels.find(a => a.level === nextInfo.nextLevel)?.threshold || 0}
              </span>
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm">
                <span className="font-medium">Next: </span>
                <AchievementBadge 
                  level={nextInfo.nextLevel} 
                  size="sm"
                  data-testid="next-achievement-badge"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-2xl mb-2">🎉</div>
            <div className="font-semibold text-yellow-800 dark:text-yellow-200">
              Maximum Achievement Reached!
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              You've reached the highest level in our community. Congratulations, Head Coach!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for dashboards
export function CompactAchievementProgress({ 
  currentLevel, 
  postCount,
  className = ""
}: AchievementProgressProps) {
  const nextInfo = getNextAchievement(postCount);
  
  if (!nextInfo.nextLevel) {
    return (
      <div className={`flex items-center gap-2 ${className}`} data-testid="compact-achievement-max">
        <AchievementBadge level={currentLevel} size="sm" />
        <span className="text-sm text-muted-foreground">Max Level</span>
      </div>
    );
  }

  const currentAchievement = achievementLevels.find(a => a.level === currentLevel);
  const nextThreshold = achievementLevels.find(a => a.level === nextInfo.nextLevel)?.threshold || 0;
  const progress = ((postCount - (currentAchievement?.threshold || 0)) / (nextThreshold - (currentAchievement?.threshold || 0))) * 100;

  return (
    <div className={`space-y-2 ${className}`} data-testid="compact-achievement-progress">
      <div className="flex items-center justify-between">
        <AchievementBadge level={currentLevel} size="sm" />
        <span className="text-xs text-muted-foreground">
          {nextInfo.postsNeeded} to go
        </span>
      </div>
      <Progress value={Math.max(0, Math.min(100, progress))} className="h-2" />
    </div>
  );
}