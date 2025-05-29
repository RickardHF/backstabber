import React, { useEffect, useRef, useState } from 'react';
import { Player, AIVision, Direction, Box, AIManagerConfig } from './game/types';
import { directionColors, aiDirectionColors } from './game/constants';
import { drawGrid, drawAiVisionCone, drawPlayer, drawBox } from './game/rendering';
import { updatePlayer } from './game/HumanPlayer';
import { updateAiPlayer } from './game/AIPlayer';
import { AIManager } from './game/AIManager';

// Function to generate random boxes
const generateRandomBoxes = (count: number, canvasWidth: number = 800, canvasHeight: number = 600): Box[] => {
  const boxes: Box[] = [];
  const minSize = 40;
  const maxSize = 80;
  
  for (let i = 0; i < count; i++) {
    // Random size between minSize and maxSize
    const width = Math.floor(Math.random() * (maxSize - minSize)) + minSize;
    const height = Math.floor(Math.random() * (maxSize - minSize)) + minSize;
    
    // Random position, ensuring box is fully within canvas
    const x = Math.floor(Math.random() * (canvasWidth - width)) + width/2;
    const y = Math.floor(Math.random() * (canvasHeight - height)) + height/2;
    
    // Random color
    const r = Math.floor(Math.random() * 200) + 50;
    const g = Math.floor(Math.random() * 200) + 50;
    const b = Math.floor(Math.random() * 200) + 50;
    const color = `rgb(${r}, ${g}, ${b})`;
    
    boxes.push({
      id: `box-${i}`,
      x,
      y,
      width,
      height,
      color,
      direction: 'none',
      speed: 0,
      size: Math.max(width, height) / 2,
      pulse: Math.random() * Math.PI * 2, // Random starting pulse phase
      rotation: 0,
      rotationSpeed: 0
    });
  }
  
  return boxes;
};

const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
    // Human-controlled player
  const [player, setPlayer] = useState<Player>({
    id: 'player1',
    x: 400,
    y: 300,
    direction: 'right',
    speed: 5,
    size: 20,
    pulse: 0,
    rotation: 0, // Initially facing right (0 radians)
    rotationSpeed: 0.1 // Speed of rotation when turning
  });
    // AI Manager configuration
  const [aiManagerConfig, setAiManagerConfig] = useState<AIManagerConfig>({
    maxBots: 2, // Default to 2 bots maximum
    spawnLocation: { x: 200, y: 200 }, // Default spawn location
    minSpawnDelay: 3000, // Min 3 seconds between spawns
    maxSpawnDelay: 6000, // Max 6 seconds between spawns
    enabled: true // AI spawning enabled by default
  });
  
  // AI Manager reference
  const aiManagerRef = useRef<AIManager | null>(null);
  
  // Create boxes (obstacles)
  const [boxes, setBoxes] = useState<Box[]>([]);
    // Initialize boxes and AI Manager when component mounts
  useEffect(() => {
    setBoxes(generateRandomBoxes(2)); // Generate 2 random boxes
    
    // Initialize AI Manager
    if (!aiManagerRef.current) {
      console.log("Initializing AI Manager with config:", aiManagerConfig);
      aiManagerRef.current = new AIManager(aiManagerConfig);
    }
  }, []);
  
  // Track pressed keys
  const [keysPressed, setKeysPressed] = useState<{ [key: string]: boolean }>({});

  // Handle key events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed((prev: { [key: string]: boolean }) => ({ ...prev, [e.key.toLowerCase()]: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeysPressed((prev: { [key: string]: boolean }) => ({ ...prev, [e.key.toLowerCase()]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  // Update AI Manager config when maxBots or spawnLocation changes
  useEffect(() => {
    if (aiManagerRef.current) {
      aiManagerRef.current.updateConfig(aiManagerConfig);
    }
  }, [aiManagerConfig]);
  // Game loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = 0;
    
    const gameLoop = (timestamp: number) => {
      // Calculate time passed since last frame for AI Manager
      const deltaTime = lastTimestamp ? timestamp - lastTimestamp : 0;
      lastTimestamp = timestamp;
      
      // Get all active AI players
      const aiPlayers = aiManagerRef.current?.getAIPlayers() || [];
      
      // Update player position with collision detection
      // Pass all AI players for collision detection
      setPlayer(prevPlayer => 
        updatePlayer(prevPlayer, keysPressed, canvasRef.current, boxes, ...aiPlayers)
      );
        // Update all AI players via the manager
      if (aiManagerRef.current) {
        // Use performance.now() for consistent timing with the AI Manager
        const currentTime = performance.now();
        aiManagerRef.current.updateAllAIPlayers(
          player,
          canvasRef.current,
          boxes,
          currentTime
        );
      }
      
      // Render game
      renderGame();
      
      // Continue the game loop
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    animationFrameId = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [keysPressed, player, boxes, aiManagerConfig]);
  
  // Render the game
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw a grid for the top-down view
    drawGrid(ctx, canvas);
    
    // Draw boxes first so they appear as background obstacles
    boxes.forEach(box => {
      drawBox(ctx, box);
    });
      
    // Get all active AI players
    const aiPlayers = aiManagerRef.current?.getAIPlayers() || [];
    
    // Draw the AI vision cones and players
    aiPlayers.forEach(aiPlayer => {
      const aiVision = aiManagerRef.current?.getAIVision(aiPlayer.id);
      
      if (aiVision) {
        // Draw the AI vision cone above boxes but behind players
        drawAiVisionCone(
          ctx, 
          aiPlayer, 
          aiVision.canSeePlayer, 
          aiVision.visionConeAngle, 
          aiVision.visionDistance, 
          boxes, 
          player
        );
      }
      
      // Then draw AI player
      drawPlayer(ctx, aiPlayer);
    });
    
    // Finally draw human player (so it appears on top if they overlap)
    drawPlayer(ctx, player);
  };
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Simple 2D Game</h1>      <div className="relative border-2 border-gray-300 dark:border-gray-700 rounded-md overflow-hidden shadow-lg">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600}
        ></canvas>
      </div>
      <div className="mt-6 p-4 bg-gray-100 dark:bg-zinc-800 rounded-md max-w-2xl shadow-md">        <div className="flex flex-col items-start mb-4">
          <h2 className="font-bold mb-3">Game Controls:</h2>
          
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <label htmlFor="boxCount" className="text-sm">Box Count:</label>
              <input 
                type="range" 
                id="boxCount" 
                min="1" 
                max="10" 
                defaultValue="2" 
                className="w-24 accent-blue-500 dark:accent-blue-400"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBoxes(generateRandomBoxes(parseInt(e.target.value)))}
              />
              <span className="text-sm">{boxes.length}</span>
            </div>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
              onClick={() => setBoxes(generateRandomBoxes(boxes.length))}
            >
              Regenerate Boxes
            </button>
          </div>
          
          <div className="flex flex-col gap-3 w-full">
            <h3 className="font-bold text-sm">AI Bot Settings:</h3>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="maxBots" className="text-sm">Max Bots:</label>
                <input 
                  type="range" 
                  id="maxBots"
                  min="1" 
                  max="4" 
                  value={aiManagerConfig.maxBots}
                  className="w-24 accent-blue-500 dark:accent-blue-400"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiManagerConfig({
                    ...aiManagerConfig,
                    maxBots: parseInt(e.target.value)
                  })}
                />
                <span className="text-sm">{aiManagerConfig.maxBots}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <label htmlFor="minDelay" className="text-sm">Min Delay (ms):</label>
                <input 
                  type="number"
                  id="minDelay" 
                  min="500" 
                  max="10000" 
                  step="500" 
                  value={aiManagerConfig.minSpawnDelay}
                  className="w-20 px-2 py-1 border rounded"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiManagerConfig({
                    ...aiManagerConfig,
                    minSpawnDelay: parseInt(e.target.value)
                  })}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label htmlFor="maxDelay" className="text-sm">Max Delay (ms):</label>
                <input 
                  type="number"
                  id="maxDelay" 
                  min="1000" 
                  max="20000"
                  step="500" 
                  value={aiManagerConfig.maxSpawnDelay}
                  className="w-20 px-2 py-1 border rounded"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiManagerConfig({
                    ...aiManagerConfig,
                    maxSpawnDelay: parseInt(e.target.value)
                  })}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <label htmlFor="aiEnabled" className="text-sm">AI Enabled:</label>
                <input 
                  type="checkbox"
                  id="aiEnabled"
                  checked={aiManagerConfig.enabled}
                  className="w-4 h-4 accent-blue-500"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiManagerConfig({
                    ...aiManagerConfig,
                    enabled: e.target.checked
                  })}
                />
              </div>
              
              <button 
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                onClick={() => {
                  // Find all AI players and mark them as dead
                  const aiPlayers = aiManagerRef.current?.getAIPlayers() || [];
                  aiPlayers.forEach((ai: Player) => aiManagerRef.current?.markAIDead(ai.id));
                }}
              >
                Kill All Bots
              </button>
            </div>
          </div>
        </div>
        <ul className="list-disc pl-5">
          <li><span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">W</span> - Move Forward</li>
          <li><span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">S</span> - Move Backward</li>
          <li><span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">A</span> - Rotate Left</li>
          <li><span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">D</span> - Rotate Right</li>
        </ul>
      </div>
    </div>
  );
};

export default Game;