import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, AIVision, Direction, Box, AIManagerConfig } from './game/types';
import { directionColors, aiDirectionColors } from './game/constants';
import { drawGrid, drawAiVisionCone, drawPlayer, drawBox, drawPlayerDeath } from './game/rendering';
import { updatePlayer, isPlayerBehindAI } from './game/HumanPlayer';
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
  const [player, setPlayer] = useState<Player>({    id: 'player1',
    x: 400,
    y: 300,
    direction: 'right',
    speed: 3,
    size: 20,
    pulse: 0,
    rotation: 0, // Initially facing right (0 radians)
    rotationSpeed: 0.1, // Speed of rotation when turning
    isDead: false
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
  
  // Track attack cooldown
  const [attackCooldown, setAttackCooldown] = useState<boolean>(false);
  
  // Track defeated enemies for scoring
  const [defeatedEnemies, setDefeatedEnemies] = useState<number>(0);
  
  // Game state management
  const [gameActive, setGameActive] = useState<boolean>(true);
  
  // Track grace period after restart
  const [graceActive, setGraceActive] = useState<boolean>(false);
  
  // Death animation properties
  const [deathAnimation, setDeathAnimation] = useState<{
    progress: number;
    killedBy: Player | null;
    animationFrameId?: number;
  }>({
    progress: 0,
    killedBy: null
  });
  
  // Handle attacking AI bots from behind
  const tryAttack = useCallback(() => {
    if (attackCooldown || !aiManagerRef.current) return;
    
    // Get all active AI bots
    const aiPlayers = aiManagerRef.current.getAIPlayers();
    
    // Check each AI bot to see if player can backstab it
    for (const aiPlayer of aiPlayers) {
      const aiVision = aiManagerRef.current.getAIVision(aiPlayer.id);
      
      if (aiVision && isPlayerBehindAI(player, aiPlayer, aiVision)) {
        // Player is behind AI and within backstabbing range
        aiManagerRef.current.markAIDead(aiPlayer.id);
        
        // Add to the defeated enemies count
        setDefeatedEnemies(prev => prev + 1);
        
        // Set cooldown to prevent rapid attacks
        setAttackCooldown(true);
        setTimeout(() => setAttackCooldown(false), 500); // 500ms cooldown
        break;
      }
    }
  }, [player, attackCooldown]);
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
      
      // Check for space bar
      if (e.key === ' ' || e.code === 'Space') {
        if (player.isDead && deathAnimation.progress >= 0.95) {
          // If player is dead and animation is complete, restart the game
          resetGame();
        } else if (!player.isDead) {
          // Otherwise try to attack if not dead
          tryAttack();
        }
      }
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
  }, [tryAttack]);
  // Update AI Manager config when maxBots or spawnLocation changes
  useEffect(() => {
    if (aiManagerRef.current) {
      aiManagerRef.current.updateConfig(aiManagerConfig);
    }
  }, [aiManagerConfig]);  // Function to handle player death
  const handlePlayerDeath = (killingAI: Player) => {
    // Prevent multiple death triggers if player is already dead
    if (player.isDead) {
      return;
    }
    
    // Stop the game loop
    setGameActive(false);
    
    // Mark player as dead
    setPlayer(prev => ({...prev, isDead: true}));
    
    // Play death sound effect
    try {
      const deathSound = new Audio('/death-sound.mp3');
      deathSound.volume = 0.5;
      deathSound.play().catch(err => console.log('Could not play death sound:', err));
    } catch (err) {
      console.log('Could not create audio object:', err);
    }
    
    // Set up death animation
    const startDeathAnimation = {
      progress: 0,
      killedBy: killingAI
    };
    
    setDeathAnimation(startDeathAnimation);
    
    // Start death animation loop
    const animatePlayerDeath = () => {
      setDeathAnimation(prev => {
        if (prev.progress < 1) {
          const newProgress = Math.min(1, prev.progress + 0.02);
          const animationId = requestAnimationFrame(animatePlayerDeath);
          return {
            ...prev,
            progress: newProgress,
            animationFrameId: animationId
          };
        }
        return prev;
      });
    };
    
    requestAnimationFrame(animatePlayerDeath);
  };
  // Reset game function
  const resetGame = () => {
    // Cancel any ongoing animation
    if (deathAnimation.animationFrameId) {
      cancelAnimationFrame(deathAnimation.animationFrameId);
    }
    
    // Clear and re-initialize the AI Manager to prevent immediate collision
    if (aiManagerRef.current) {
      // Remove all existing AI bots
      const aiPlayers = aiManagerRef.current.getAIPlayers();
      aiPlayers.forEach(ai => aiManagerRef.current?.markAIDead(ai.id));
      
      // Re-initialize with a new manager and updated spawn locations after a delay
      setTimeout(() => {
        aiManagerRef.current = new AIManager({
          ...aiManagerConfig,
          // Force the first bot to spawn far away from the player
          spawnLocation: { 
            x: Math.random() > 0.5 ? 100 : 700, // Far left or right
            y: Math.random() > 0.5 ? 100 : 500  // Far top or bottom
          },
          // Add a longer initial delay before first spawn after restart
          minSpawnDelay: aiManagerConfig.minSpawnDelay + 3000,
          maxSpawnDelay: aiManagerConfig.maxSpawnDelay + 3000
        });
        
        // Reset spawn delays after first spawn
        setTimeout(() => {
          if (aiManagerRef.current) {
            aiManagerRef.current.updateConfig({
              minSpawnDelay: aiManagerConfig.minSpawnDelay,
              maxSpawnDelay: aiManagerConfig.maxSpawnDelay
            });
          }
        }, 5000);
      }, 1000); // Longer delay to ensure player has time to react
    }
      // Reset game state
    setGameActive(true);
    
    // Set grace period active to prevent immediate death after spawn
    setGraceActive(true);
    setTimeout(() => {
      setGraceActive(false);
    }, 2000); // 2 seconds of grace period
    
    setPlayer(prev => ({
      ...prev,
      x: 400,
      y: 300,
      direction: 'right',
      rotation: 0,
      pulse: 0,
      isDead: false
    }));
    
    // Reset death animation
    setDeathAnimation({
      progress: 0,
      killedBy: null
    });
    
    // Generate new boxes with proper dimensions
    const canvas = canvasRef.current;
    if (canvas) {
      setBoxes(generateRandomBoxes(boxes.length, canvas.width, canvas.height));
    } else {
      setBoxes(generateRandomBoxes(boxes.length));
    }
    
    // Play a restart sound if available
    const restartSound = new Audio('/death-sound.mp3');
    restartSound.volume = 0.3;
    restartSound.play().catch(e => console.log('Could not play restart sound', e));
    
    // Start grace period
    setGraceActive(true);
    setTimeout(() => setGraceActive(false), 3000); // 3 seconds grace period
  };
  
  // Game loop
  useEffect(() => {
    // Don't run game loop if game is not active
    if (!gameActive) return;
    
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
      setPlayer(prevPlayer => {
        const result = updatePlayer(prevPlayer, keysPressed, canvasRef.current, boxes, ...aiPlayers);
        
        // Check if player collided with an AI bot, isn't already dead and not in grace period
        if (result.collidedWithAI && result.collidingAI && !prevPlayer.isDead && !graceActive) {
          // Check if the AI vision exists and if player is NOT behind the AI
          const aiVision = aiManagerRef.current?.getAIVision(result.collidingAI.id);
          const isPlayerBehind = aiVision ? isPlayerBehindAI(prevPlayer, result.collidingAI, aiVision) : false;
          
          // Only kill the player if they collided with an AI from the front (within AI's vision cone)
          if (!isPlayerBehind) {
            // AI bot kills the player
            setTimeout(() => handlePlayerDeath(result.collidingAI!), 0);
            return { ...result.updatedPlayer, isDead: true };
          }
        }
        
        return result.updatedPlayer;
      });
      
      // Update all AI players via the manager if game is still active
      if (aiManagerRef.current && gameActive) {
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
      
      // Continue the game loop if game is active
      if (gameActive && !player.isDead) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };
    
    animationFrameId = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [keysPressed, player, boxes, aiManagerConfig, gameActive]);
  
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
        
        // Check if player is behind this AI and highlight it as vulnerable
        if (!player.isDead && isPlayerBehindAI(player, aiPlayer, aiVision)) {
          // Draw a targeting indicator around the AI
          ctx.beginPath();
          ctx.arc(aiPlayer.x, aiPlayer.y, aiPlayer.size + 8, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';  
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Add text hint above the AI
          ctx.font = '12px Arial';
          ctx.fillStyle = 'red';
          ctx.textAlign = 'center';
          ctx.fillText('Backstab!', aiPlayer.x, aiPlayer.y - aiPlayer.size - 10);
        }
      }
      
      // Then draw AI player
      drawPlayer(ctx, aiPlayer);
    });    if (player.isDead) {
      // Draw death animation instead of normal player
      drawPlayerDeath(ctx, player, deathAnimation.killedBy, deathAnimation.progress);
      
      // For visual effect only - draw a darker overlay when the animation is progressing
      // The actual UI elements are handled by the React overlay
      if (deathAnimation.progress >= 0.5 && deathAnimation.progress < 0.95) {
        const overlayOpacity = (deathAnimation.progress - 0.5) * 2 * 0.5; // 0 to 0.5 opacity
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }    } else {
      // Draw normal player
      drawPlayer(ctx, player);
      
      // If grace period is active, draw a protective shield around the player
      if (graceActive) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(64, 196, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Add shield text
        ctx.font = '12px Arial';
        ctx.fillStyle = 'lightblue';
        ctx.textAlign = 'center';
        ctx.fillText('Shield Active', player.x, player.y - player.size - 10);
      }
    }
  };
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-2xl mb-4">
        <h1 className="text-2xl font-bold">Backstabber Game</h1>
        <div className="flex items-center">
          <span className="mr-2 font-bold">Defeated:</span>
          <span className="bg-red-500 text-white px-3 py-1 rounded-md">{defeatedEnemies}</span>
        </div>
      </div>
      <div className="relative border-2 border-gray-300 dark:border-gray-700 rounded-md overflow-hidden shadow-lg">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600}
        ></canvas>        {attackCooldown && !player.isDead && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded">
            Attack Cooldown
          </div>
        )}
        {graceActive && !player.isDead && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 bg-opacity-70 text-white px-4 py-2 rounded">
            Shield Active
          </div>
        )}
        {player.isDead && deathAnimation.progress >= 0.95 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70">
            <h2 className="text-4xl font-bold text-red-500 mb-2">GAME OVER</h2>
            <p className="text-xl text-white mb-6">Killed by AI Bot</p>
            <button 
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg text-lg transition-colors"
              onClick={resetGame}
            >
              Restart Game
            </button>
            <p className="text-sm text-gray-300 mt-4">Press SPACE to restart</p>
          </div>
        )}
      </div>
        <div className="mt-6 p-4 bg-gray-100 dark:bg-zinc-800 rounded-md max-w-2xl shadow-md">
          <div className="flex flex-col items-start mb-4">
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
          <li><span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">Space</span> - Attack (Backstab)</li>
        </ul>        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 dark:bg-opacity-30 border border-red-200 dark:border-red-800 rounded-md">
          <h3 className="font-bold text-sm mb-1">Backstabbing Mechanics:</h3>
          <p className="text-sm">Get behind AI bots (outside their vision cone) and press <span className="font-mono bg-gray-200 dark:bg-zinc-700 px-2 py-0.5 rounded">Space</span> to defeat them with a backstab. When an AI is vulnerable, a red dashed circle will appear around it.</p>
        </div>
      </div>
    </div>
  );
};

export default Game;