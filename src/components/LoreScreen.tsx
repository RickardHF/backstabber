"use client";

import React, { useEffect, useRef, useState } from 'react';

interface LoreScreenProps {
  onStartGame: () => void;
  onBackToMenu: () => void;
}

/* Placeholder lore text – user will replace */
const PLACEHOLDER_LORE = `In the age before lantern-light, when citadels bled rust and
whispers weighed more than coin, a silent covenant was struck.

You were its finest shadow.

But betrayal cleaved the circle. Branded oathbreaker, you now
walk the perimeter of a forgotten arena where sentry souls
loop their last patrols.

Only by reclaiming the art of the unseen strike will the seal
on your name fracture.

Watch the angles. Harvest the blind side. Let no gaze
resolve your outline.

Become the absence they never map.`;

const LoreScreen: React.FC<LoreScreenProps> = ({ onStartGame, onBackToMenu }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showChoices, setShowChoices] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const startId = requestAnimationFrame(() => {
      el.classList.add('lore-scroll-start');
    });
    const handleEnd = () => setShowChoices(true);
    el.addEventListener('animationend', handleEnd);
    return () => { cancelAnimationFrame(startId); el.removeEventListener('animationend', handleEnd); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-3xl mx-auto p-4">
  <div className="relative w-full panel p-6 md:p-10 overflow-hidden" style={{ minHeight: '480px' }}>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[var(--background)] via-transparent to-[var(--background)]" />
        <div ref={containerRef} className="lore-scroll font-pixel whitespace-pre-line text-sm md:text-base leading-relaxed tracking-wide text-[var(--muted)] px-2">
          {PLACEHOLDER_LORE}
        </div>
        <div className={`flex flex-col items-center gap-4 transition-opacity duration-700 ${showChoices ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
             style={{ position: 'absolute', bottom: '1.5rem', left: 0, right: 0 }}>
          <button className="btn-medieval btn-medieval--primary" onClick={onStartGame}>Enter Arena</button>
          <button className="btn-medieval" onClick={onBackToMenu}>Main Menu</button>
        </div>
      </div>
    </div>
  );
};

export default LoreScreen;
