import React from 'react';
import { ReactionEvent } from '../types';

interface FloatingReactionsProps {
  reactions: ReactionEvent[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({ reactions }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {reactions.map((r, i) => {
        // Distribute randomly across screen bottom-center to float up
        const leftOffset = 30 + ((i * 17 + (r.timestamp % 40)) % 40);
        return (
          <div
            key={r.id}
            className="absolute bottom-16 text-3xl sm:text-4xl animate-float-heart"
            style={{
              left: `${leftOffset}%`,
              animationDuration: `${2.4 + (i % 3) * 0.4}s`,
            }}
          >
            {r.emoji}
          </div>
        );
      })}
    </div>
  );
};
