'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import StartScreen from './StartScreen';
import LoreScreen from './LoreScreen';

// Use dynamic import with no SSR for the Game component
// This prevents "window is not defined" errors since we're using browser APIs
const GameWithNoSSR = dynamic(() => import('./Game'), {
  ssr: false,
});

export default function ClientGameWrapper() {
  type View = 'menu' | 'lore' | 'game';
  const [view, setView] = useState<View>('menu');

  const startGame = () => setView('game');
  const showLore = () => setView('lore');
  const goMenu = () => setView('menu');

  return (
    <div className="w-full max-w-6xl mx-auto panel panel--ornate p-3 md:p-5">
      {view === 'menu' && <StartScreen onGameStart={startGame} onShowLore={showLore} />}
      {view === 'lore' && <LoreScreen onStartGame={startGame} onBackToMenu={goMenu} />}
  {view === 'game' && <GameWithNoSSR key="game" onExitToMenu={goMenu} />}
      {/* Hidden nav state debug (could be removed) */}
      <input type="hidden" value={view} readOnly />
    </div>
  );
}
