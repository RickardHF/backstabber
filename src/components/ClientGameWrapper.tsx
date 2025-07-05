'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import StartScreen from './StartScreen';

// Use dynamic import with no SSR for the Game component
// This prevents "window is not defined" errors since we're using browser APIs
const GameWithNoSSR = dynamic(() => import('./Game'), {
  ssr: false,
});

export default function ClientGameWrapper() {
  const [gameStarted, setGameStarted] = useState(false);

  const handleGameStart = () => {
    setGameStarted(true);
  };
  return (
    <div className="w-full max-w-6xl mx-auto rounded-lg overflow-hidden shadow-lg p-2 md:p-4 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
      {!gameStarted ? (
        <StartScreen onGameStart={handleGameStart} />
      ) : (
        <GameWithNoSSR />
      )}
    </div>
  );
}
