'use client';

/**
 * ReputationBadge
 *
 * Displays an on-chain reputation score as filled/empty stars
 * plus a numeric average and rating count.
 */

import { Star } from 'lucide-react';

interface ReputationBadgeProps {
  /** Fixed-point ×100 average from the reputation contract */
  averageX100:  bigint | number;
  totalRatings: number;
  size?:        'sm' | 'md' | 'lg';
}

export function ReputationBadge({
  averageX100,
  totalRatings,
  size = 'md',
}: ReputationBadgeProps) {
  const avg      = Number(averageX100) / 100;
  const filled   = Math.round(avg);
  const starSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  if (totalRatings === 0) {
    return (
      <span className={`${textSize} text-slate-400 italic`}>No ratings yet</span>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 ${textSize}`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map(i => (
          <Star
            key={i}
            className={`${starSize} ${
              i <= filled
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-slate-200 fill-slate-100'
            }`}
          />
        ))}
      </div>
      <span className="font-semibold text-slate-700">{avg.toFixed(2)}</span>
      <span className="text-slate-400">({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})</span>
    </div>
  );
}
