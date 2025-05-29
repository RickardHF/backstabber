import { useEffect, useRef, useState } from 'react';
import { Player, AIVision, Direction, Box } from './game/types';
import { directionColors, aiDirectionColors } from './game/constants';
import { drawGrid, drawAiVisionCone, drawPlayer, drawBox } from './game/rendering';
import { updatePlayer } from './game/HumanPlayer';
import { updateAiPlayer } from './game/AIPlayer';

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
  
  // AI-controlled player
  const [aiPlayer, setAiPlayer] = useState<Player>({
    id: 'ai1',
    x: 200,
    y: 200,
    direction: 'right',
    speed: 3, // Slightly slower than human player
    size: 20,
    pulse: Math.PI, // Start at different phase for visual distinction
    isAI: true,
    rotation: 0, // Initially facing right (0 radians)
    rotationSpeed: 0.08 // Slightly slower rotation than the player
  });
  
  // Create boxes (obstacles)
  const [boxes, setBoxes] = useState<Box[]>([]);
  
  // Initialize boxes when component mounts
  useEffect(() => {
    setBoxes(generateRandomBoxes(2)); // Generate 2 random boxes
  }, []);
  
  // AI vision state
  const [aiVision, setAiVision] = useState<AIVision>({
    canSeePlayer: false,
    visionConeAngle: 220, // 220 degrees vision cone
    visionDistance: 40 * 4 // 4x the body size (40 is body diameter)
  });
  
  // Track pressed keys
  const [keysPressed, setKeysPressed] = useState<{ [key: string]: boolean }>({});

  // Handle key events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed((prev) => ({ ...prev, [e.key.toLowerCase()]: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeysPressed((prev) => ({ ...prev, [e.key.toLowerCase()]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
    // AI movement logic
  useEffect(() => {
    const aiMovementInterval = setInterval(() => {
      // Only change rotation randomly if AI can't see the player
      if (!aiVision.canSeePlayer && Math.random() < 0.1) { // 10% chance on each interval to change direction
        // Random rotation change - between -π/2 and π/2 (quarter turn in either direction)
        const randomRotation = Math.random() * Math.PI - Math.PI/2;
        setAiPlayer(prev => {
          let newRotation = (prev.rotation || 0) + randomRotation;
          // Keep rotation in 0-2π range
          if (newRotation < 0) newRotation += Math.PI * 2;
          if (newRotation >= Math.PI * 2) newRotation -= Math.PI * 2;
          
          // Update direction based on new rotation angle
          let newDirection: Direction = 'right';
          if (newRotation >= 7 * Math.PI / 4 || newRotation < Math.PI / 4) {
            newDirection = 'right';
          } else if (newRotation >= Math.PI / 4 && newRotation < 3 * Math.PI / 4) {
            newDirection = 'down';
          } else if (newRotation >= 3 * Math.PI / 4 && newRotation < 5 * Math.PI / 4) {
            newDirection = 'left';
          } else {
            newDirection = 'up';
          }
          
          return { 
            ...prev, 
            rotation: newRotation,
            direction: newDirection 
          };
        });
      }
    }, 200); // Check for direction change every 200ms
    
    return () => clearInterval(aiMovementInterval);
  }, [aiVision.canSeePlayer]);
    // Game loop
  useEffect(() => {
    let animationFrameId: number;
    const gameLoop = () => {
      // Update player position with collision detection
      setPlayer(prevPlayer => 
        updatePlayer(prevPlayer, keysPressed, canvasRef.current, boxes, aiPlayer)
      );
      
      // Update AI player position and vision with collision detection
      const { updatedAiPlayer, updatedAiVision } = updateAiPlayer(
        aiPlayer,
        player,
        aiVision,
        canvasRef.current,
        boxes
      );
      
      setAiPlayer(updatedAiPlayer);
      setAiVision(updatedAiVision);
      
      // Render game
      renderGame();
      
      // Continue the game loop
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    animationFrameId = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [keysPressed, player, aiPlayer, aiVision, boxes]);
  
  // Render the game
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw a grid for the top-down view
    drawGrid(ctx, canvas);
    
    // Draw boxes first so they appear as background obstacles
    boxes.forEach(box => {
      drawBox(ctx, box);
    });
      // Draw the AI vision cone above boxes but behind players
    drawAiVisionCone(ctx, aiPlayer, aiVision.canSeePlayer, aiVision.visionConeAngle, aiVision.visionDistance, boxes, player);
      
    // Then draw AI player
    drawPlayer(ctx, aiPlayer);
      
    // Finally draw human player (so it appears on top if they overlap)
    drawPlayer(ctx, player);
  };
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Simple 2D Game</h1>
      <div className="relative border-2 border-gray-300 dark:border-gray-700 rounded-md overflow-hidden shadow-lg">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600}
        ></canvas>
        <div className="absolute top-4 left-4 bg-black/60 dark:bg-black/80 text-white p-3 rounded-md shadow-md backdrop-blur-sm">
          <p>Use <span className="font-bold">WASD</span> keys to move</p>
          <p>Player facing: <span className="font-bold uppercase">{player.direction}</span> ({(player.rotation * 180 / Math.PI).toFixed(0)}°)</p>
          <p>AI facing: <span className="font-bold uppercase">{aiPlayer.direction}</span> ({(aiPlayer.rotation * 180 / Math.PI).toFixed(0)}°)</p>
          <p>AI vision: 
            <span className={`font-bold ml-1 ${aiVision.canSeePlayer ? 'text-red-400' : ''}`}>
              {aiVision.canSeePlayer ? 'PLAYER DETECTED!' : 'Scanning...'}
            </span>
          </p>
          <p className="text-xs mt-1">Game contains <span className="font-bold">{boxes.length}</span> obstacle boxes</p>
          <p className="text-xs">Collide with boxes and other players</p>
          
          <div className="mt-2">
            <p className="text-xs mb-1">Player colors:</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(directionColors).map(([dir, color]) => (
                dir !== 'none' && (
                  <div key={dir} className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: color }}></div>
                    <span className="text-xs uppercase">{dir}</span>
                  </div>
                )
              ))}
            </div>
            
            <p className="text-xs mb-1 mt-2">AI colors:</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(aiDirectionColors).map(([dir, color]) => (
                dir !== 'none' && (
                  <div key={dir} className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: color }}></div>
                    <span className="text-xs uppercase">{dir}</span>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 p-4 bg-gray-100 dark:bg-zinc-800 rounded-md max-w-2xl shadow-md">        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
          <h2 className="font-bold">Game Controls:</h2>
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <div className="flex items-center gap-2">
              <label htmlFor="boxCount" className="text-sm">Box Count:</label>
              <input 
                type="range" 
                id="boxCount" 
                min="1" 
                max="10" 
                defaultValue="2" 
                className="w-24 accent-blue-500 dark:accent-blue-400"
                onChange={(e) => setBoxes(generateRandomBoxes(parseInt(e.target.value)))}
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