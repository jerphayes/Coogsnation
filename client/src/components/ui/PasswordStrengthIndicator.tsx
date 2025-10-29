import { useState, useEffect } from 'react';
import { calculatePasswordStrength } from '@shared/schema';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className = '' }: PasswordStrengthIndicatorProps) {
  const [strength, setStrength] = useState({
    score: 0,
    feedback: [] as string[],
    color: 'red',
    label: 'Very Weak'
  });

  useEffect(() => {
    if (password) {
      const strengthData = calculatePasswordStrength(password);
      setStrength(strengthData);
    } else {
      setStrength({
        score: 0,
        feedback: [],
        color: 'red',
        label: 'Very Weak'
      });
    }
  }, [password]);

  if (!password) return null;

  const getColorClass = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'orange': return 'bg-orange-500';
      case 'yellow': return 'bg-yellow-500';
      case 'green': return 'bg-green-500';
      case 'darkgreen': return 'bg-green-600';
      default: return 'bg-gray-300';
    }
  };

  const getTextColorClass = (color: string) => {
    switch (color) {
      case 'red': return 'text-red-600';
      case 'orange': return 'text-orange-600';
      case 'yellow': return 'text-yellow-600';
      case 'green': return 'text-green-600';
      case 'darkgreen': return 'text-green-700';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`space-y-2 ${className}`} data-testid="password-strength-indicator">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Password Strength</span>
        <span className={`text-sm font-semibold ${getTextColorClass(strength.color)}`} data-testid="strength-label">
          {strength.label}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getColorClass(strength.color)}`}
          style={{ width: `${Math.min(strength.score, 100)}%` }}
          data-testid="strength-progress"
        />
      </div>

      {strength.feedback.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1" data-testid="password-feedback">
          {strength.feedback.map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="text-red-500">•</span>
              {item}
            </li>
          ))}
        </ul>
      )}

      {strength.score >= 100 && (
        <div className="flex items-center gap-1 text-xs text-green-600" data-testid="password-requirements-met">
          <span>✓</span>
          All requirements met!
        </div>
      )}
    </div>
  );
}