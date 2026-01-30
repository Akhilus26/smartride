import React from 'react';
import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getCrowdLevel, getCrowdLevelBg, CrowdLevel } from '@/types';
import { cn } from '@/lib/utils';

interface CrowdIndicatorProps {
  passengerCount: number;
  capacity: number;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CrowdIndicator({ 
  passengerCount, 
  capacity, 
  showCount = true,
  size = 'md' 
}: CrowdIndicatorProps) {
  const level = getCrowdLevel(passengerCount, capacity);
  const percentage = Math.round((passengerCount / capacity) * 100);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const getLevelIcon = () => {
    switch (level) {
      case 'low':
        return <TrendingDown className={iconSizes[size]} />;
      case 'medium':
        return <Minus className={iconSizes[size]} />;
      case 'high':
        return <TrendingUp className={iconSizes[size]} />;
    }
  };

  const getLevelText = () => {
    switch (level) {
      case 'low':
        return 'Low Crowd';
      case 'medium':
        return 'Medium Crowd';
      case 'high':
        return 'High Crowd';
    }
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        getCrowdLevelBg(level),
        sizeClasses[size]
      )}
    >
      {getLevelIcon()}
      <span>{getLevelText()}</span>
      {showCount && (
        <span className="opacity-75">
          ({passengerCount}/{capacity})
        </span>
      )}
    </div>
  );
}

interface CrowdProgressProps {
  passengerCount: number;
  capacity: number;
  showLabel?: boolean;
}

export function CrowdProgress({ passengerCount, capacity, showLabel = true }: CrowdProgressProps) {
  const level = getCrowdLevel(passengerCount, capacity);
  const percentage = Math.min(Math.round((passengerCount / capacity) * 100), 100);

  const progressColors = {
    low: 'bg-success',
    medium: 'bg-warning',
    high: 'bg-destructive',
  };

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Occupancy</span>
          <span className="font-medium">{percentage}%</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', progressColors[level])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{passengerCount} passengers</span>
          <span>Capacity: {capacity}</span>
        </div>
      )}
    </div>
  );
}
