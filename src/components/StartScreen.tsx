'use client';

import React from 'react';
import { useIsMobile } from './game/useIsMobile';

interface StartScreenProps {
  onGameStart: () => void;
  onShowLore: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onGameStart, onShowLore }) => {
  const isMobile = useIsMobile();
    return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-screen-lg mx-auto p-4">
      <div className="w-full max-w-2xl panel p-8 space-y-8">
        <h2 className="game-title text-4xl md:text-5xl mb-2 text-center">Backstabber</h2>
        <p className="text-base md:text-lg text-center text-[var(--muted)] leading-relaxed max-w-xl mx-auto">
          A stealth skirmish of shadows and steel. Circle unseen, pierce the blind side, vanish before the echo.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <button
            onClick={onGameStart}
            className="btn-medieval btn-medieval--primary"
          >
            Enter Arena
          </button>
          <button
            onClick={onShowLore}
            className="btn-medieval"
          >
            Lore
          </button>
        </div>
        <div className="p-4 rounded-md bg-[var(--background-alt)]/60 border border-[var(--panel-border)] shadow-inner">
          <h3 className="font-pixel text-xs tracking-wide mb-3 text-center text-[var(--gold)]">HOW TO PLAY</h3>
          {isMobile ? (
            <div>
              <p className="text-sm mb-3 text-center text-[var(--muted)] font-light">Use touch controls to play:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm marker:text-[var(--accent)]">
                <li>Use the virtual joystick to move and rotate</li>
                <li>Tap the attack button to backstab enemies</li>
                <li>Stay behind enemies to avoid their vision</li>
              </ul>
            </div>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-sm marker:text-[var(--accent)]">
              <li><span className="hud-counter">W</span> – Move Forward</li>
              <li><span className="hud-counter">S</span> – Move Backward</li>
              <li><span className="hud-counter">A</span> – Rotate Left</li>
              <li><span className="hud-counter">D</span> – Rotate Right</li>
              <li><span className="hud-counter">SPACE</span> – Backstab</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
