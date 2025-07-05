'use client';

import React from 'react';
import { useIsMobile } from './game/useIsMobile';

interface StartScreenProps {
  onGameStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onGameStart }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col items-center justify-center h-[600px] w-[800px] bg-gray-100 dark:bg-zinc-800 rounded-md">
      <h2 className="text-4xl font-bold mb-6 animate-pulse">Backstabber</h2>
      <p className="text-lg mb-8 max-w-md text-center">
        A stealth game where you must sneak behind AI opponents and take them down.
        Be careful - they can see you if you&apos;re in their vision cone!
      </p>
      <button 
        onClick={onGameStart}
        className="bg-blue-500 text-white px-8 py-3 text-xl rounded-lg hover:bg-blue-600 
                 dark:bg-blue-600 dark:hover:bg-blue-700 transform hover:scale-105 
                 transition-all shadow-lg"
      >
        Start Game
      </button>
      
      <div className="mt-12 p-4 bg-white dark:bg-zinc-700 rounded-md shadow-md max-w-md">
        <h3 className="font-bold mb-2">How to Play:</h3>
        {isMobile ? (
          <div>
            <p className="text-sm mb-3">Use touch controls to play:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the virtual joystick to move and rotate</li>
              <li>Tap the attack button to backstab enemies</li>
              <li>Stay behind enemies to avoid their vision</li>
            </ul>
          </div>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">W</span> - Move Forward</li>
            <li><span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">S</span> - Move Backward</li>
            <li><span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">A</span> - Rotate Left</li>
            <li><span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">D</span> - Rotate Right</li>
            <li><span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">Space</span> - Backstab</li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default StartScreen;
