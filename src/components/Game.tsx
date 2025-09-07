import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, Box, AIManagerConfig } from './game/types';
import { drawGrid, drawAiVisionCone, drawPlayer, drawBox, drawPlayerDeath, rayBoxIntersection, startFrameTiming } from './game/rendering';
import { updatePlayer, isPlayerBehindAI } from './game/HumanPlayer';
import { AIManager } from './game/AIManager';
import MobileControls from './game/MobileControls';
import { useIsMobile } from './game/useIsMobile';
import { useFullscreen } from './game/useFullscreen';
import { useOrientation } from './game/useOrientation';
import { generateMapLayout, getUserSpawnPoint } from './game/MapLayout';
import { debugSpriteLoading } from '../utils/debugSprites';

interface GameProps {
  onExitToMenu?: () => void;
}

const Game: React.FC<GameProps> = ({ onExitToMenu }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Get user spawn point from map layout
  const userSpawn = getUserSpawnPoint();
    // Human-controlled player
  const [player, setPlayer] = useState<Player>({
    id: 'player1',
    x: userSpawn.x,
    y: userSpawn.y,
    direction: 'right',
    // Speed expressed as pixels per second (was ~3px per frame @60fps -> 180px/s)
    speed: 180,
    size: 20,
    pulse: 0,
    rotation: 0, // Initially facing right (0 radians)
    // Rotation speed in radians per second (0.1 rad/frame * 60fps = 6 rad/s)
    rotationSpeed: 6,
    isDead: false,
    isAttacking: false, // Initialize attacking state
    vision: {
      visionConeAngle: 220, // Same 220-degree field of view as AI
      visionDistance: 40 * 5 // 5x the body size - slightly larger than AI
    }
  });// AI Manager configuration
  const [aiManagerConfig] = useState<AIManagerConfig>({
    maxBots: 2, // Default to 2 bots maximum
    spawnLocation: { x: 200, y: 200 }, // This will be overridden by the MapLayout system
    minSpawnDelay: 3000, // Min 3 seconds between spawns
    maxSpawnDelay: 6000, // Max 6 seconds between spawns
    enabled: true // AI spawning enabled by default
  });
  
  // AI Manager reference
  const aiManagerRef = useRef<AIManager | null>(null);
  
  // Create walls using the fixed map layout
  const [boxes, setBoxes] = useState<Box[]>([]);
  
  // Track attack cooldown
  const [attackCooldown, setAttackCooldown] = useState<boolean>(false);
  
  // Track defeated enemies for scoring
  const [defeatedEnemies, setDefeatedEnemies] = useState<number>(0);
  
  // Game state management
  const [gameActive, setGameActive] = useState<boolean>(true);
  
  // Track grace period after restart
  const [graceActive, setGraceActive] = useState<boolean>(false);
  
  // Death animation properties (now time-based with minimum duration)
  const [deathAnimation, setDeathAnimation] = useState<{
    progress: number; // 0..1
    killedBy: Player | null;
    animationFrameId?: number;
    startTime?: number;
    durationMs?: number;
    overlayDelayMs?: number;
    overlayReady?: boolean;
  }>({
    progress: 0,
    killedBy: null
  });  // Handle attacking AI bots from behind
  const tryAttack = useCallback(() => {
    if (attackCooldown || !aiManagerRef.current) return;
    
    // Set the player as attacking
    setPlayer(prev => ({ ...prev, isAttacking: true }));
    
    // Get all active AI bots
    const aiPlayers = aiManagerRef.current.getAIPlayers();
    
    // Check each AI bot to see if player can backstab it
    for (const aiPlayer of aiPlayers) {
      if (aiPlayer.isDead) continue; // skip corpses
      const aiVision = aiManagerRef.current.getAIVision(aiPlayer.id);
      
      if (aiVision && isPlayerBehindAI(player, aiPlayer, aiVision)) {
        // Player is behind AI and within backstabbing range
        aiManagerRef.current.markAIDead(aiPlayer.id);
        
        // Add to the defeated enemies count
        setDefeatedEnemies(prev => prev + 1);
        break;
      }
    }
    
    // Set cooldown to prevent rapid attacks
    setAttackCooldown(true);
    
    // Reset attacking state after a short duration (attack animation length)
    setTimeout(() => {
      setPlayer(prev => ({ ...prev, isAttacking: false }));
    }, 300); // 300ms attack animation duration
    
    setTimeout(() => setAttackCooldown(false), 500); // 500ms cooldown
  }, [player, attackCooldown]);

  // Function to handle player death
  const handlePlayerDeath = useCallback((killingAI: Player) => {
    // Prevent multiple death triggers if player is already dead
    if (player.isDead) {
      return;
    }
  // Keep game loop running so we can render death animation; we'll just freeze logic updates
    
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
    
    // Set up death animation: play frames quickly, delay overlay
    const startDeathAnimation = {
      progress: 0,
      killedBy: killingAI,
      startTime: performance.now(),
  durationMs: 400, // animation lasts 400ms
      overlayDelayMs: 2000, // wait at least 2s total before GAME OVER
      overlayReady: false
    };
    
    setDeathAnimation(startDeathAnimation);
    
    // Start death animation loop (progress + overlay delay)
    const animatePlayerDeath = () => {
      setDeathAnimation(prev => {
        if (!prev.startTime) return prev;
        const now = performance.now();
        const elapsed = now - prev.startTime;
        const newProgress = prev.durationMs ? Math.min(1, elapsed / prev.durationMs) : 1;
        const overlayReady = prev.overlayDelayMs ? elapsed >= prev.overlayDelayMs : newProgress >= 1;
        if (!overlayReady) {
          const animationId = requestAnimationFrame(animatePlayerDeath);
          return { ...prev, progress: newProgress, overlayReady, animationFrameId: animationId };
        }
        return { ...prev, progress: newProgress, overlayReady };
      });
    };
    
    requestAnimationFrame(animatePlayerDeath);
  }, [player.isDead, aiManagerRef]);  
  // Reset game function - moved up to be defined before it's used in dependencies
  const resetGame = useCallback(() => {
    // Cancel any ongoing animation
    if (deathAnimation.animationFrameId) {
      cancelAnimationFrame(deathAnimation.animationFrameId);
    }
    
    // Reset the score when restarting the game
    setDefeatedEnemies(0);
    
    // Clear and re-initialize the AI Manager to prevent immediate collision
    if (aiManagerRef.current) {
      // Remove all existing AI bots
      const aiPlayers = aiManagerRef.current.getAIPlayers();
      aiPlayers.forEach(ai => aiManagerRef.current?.markAIDead(ai.id));
      
      // Re-initialize with a new manager and updated spawn locations after a delay
      setTimeout(() => {
        aiManagerRef.current = new AIManager({
          ...aiManagerConfig,
          // The AIManager will use the MapLayout system for spawn points
          spawnLocation: { x: 0, y: 0 }, // This will be ignored by the new system
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
      // Reset player to user spawn point
    const userSpawn = getUserSpawnPoint();
    setPlayer(prev => ({
      ...prev,
      x: userSpawn.x,
      y: userSpawn.y,
      direction: 'right',
  speed: 180, // pixels per second
  rotation: 0,
  rotationSpeed: 6, // radians per second
      pulse: 0,
      isDead: false,
      isAttacking: false, // Reset attacking state
      vision: {
        visionConeAngle: 220, // Same 220-degree field of view as AI
        visionDistance: 40 * 5 // 5x the body size
      }
    }));
    
    // Reset death animation
    setDeathAnimation({
      progress: 0,
      killedBy: null
    });
    
    // Generate new map layout
    const canvas = canvasRef.current;
    if (canvas) {
      setBoxes(generateMapLayout(canvas.width, canvas.height));
    } else {
      setBoxes(generateMapLayout());
    }
    
    // Play a restart sound if available
    const restartSound = new Audio('/death-sound.mp3');
    restartSound.volume = 0.3;
    restartSound.play().catch(e => console.log('Could not play restart sound', e));
    
    // Start grace period
    setGraceActive(true);
    setTimeout(() => setGraceActive(false), 3000); // 3 seconds grace period
  }, [deathAnimation.animationFrameId, aiManagerConfig]);  // Initialize map layout and AI Manager when component mounts
  useEffect(() => {
    setBoxes(generateMapLayout()); // Generate the fixed map layout
    
    // Debug sprite loading in development/deployment
    if (typeof window !== 'undefined') {
      debugSpriteLoading().then((workingPaths) => {
        if (workingPaths) {
          console.log('Sprite system ready with paths:', workingPaths);
        } else {
          console.log('Sprite system will use procedural generation');
        }
      });
    }
    
    // Initialize AI Manager
    if (!aiManagerRef.current) {
      console.log("Initializing AI Manager with config:", aiManagerConfig);
      aiManagerRef.current = new AIManager(aiManagerConfig);
    }
  }, [aiManagerConfig]);
    // Mobile controls
  const isMobile = useIsMobile();
  const orientation = useOrientation();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(gameContainerRef);
  
  const [joystickInput, setJoystickInput] = useState<{ x: number; y: number } | null>(null);
  
  // Auto-enter fullscreen for mobile landscape
  useEffect(() => {
    if (isMobile && orientation.isLandscape && !fullscreen.isFullscreen && fullscreen.isSupported) {
      // Small delay to ensure the orientation change is complete
      setTimeout(() => {
        fullscreen.enterFullscreen();
      }, 100);
    }
  }, [isMobile, orientation.isLandscape, fullscreen]);
  
  // Handle fullscreen button click
  const handleFullscreenToggle = useCallback(() => {
    fullscreen.toggleFullscreen();
  }, [fullscreen]);

  // Handle mobile joystick movement
  const handleJoystickMove = useCallback((direction: { x: number; y: number }) => {
    // Only set joystick input if there's actual movement
    if (Math.abs(direction.x) > 0.01 || Math.abs(direction.y) > 0.01) {
      setJoystickInput(direction);
    } else {
      setJoystickInput(null);
    }
  }, []);
  // Handle mobile attack button
  const handleMobileAttack = useCallback(() => {
    if (!player.isDead) {
      tryAttack();
    }
  }, [player.isDead, tryAttack]);
    // Track pressed keys
  const [keysPressed, setKeysPressed] = useState<{ [key: string]: boolean }>({});
  
  // Handle key events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed((prev: { [key: string]: boolean }) => ({ ...prev, [e.key.toLowerCase()]: true }));
      
      // Check for space bar
      if (e.key === ' ' || e.code === 'Space') {
        // Prevent default space bar behavior (page scrolling)
        e.preventDefault();
        
  if (player.isDead && deathAnimation.overlayReady) {
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
      
      // Prevent default for spacebar on keyup as well
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tryAttack, player.isDead, deathAnimation.progress, deathAnimation.overlayReady, resetGame]);
  // Update AI Manager config when maxBots or spawnLocation changes
  useEffect(() => {
    if (aiManagerRef.current) {
      aiManagerRef.current.updateConfig(aiManagerConfig);
    }
  }, [aiManagerConfig]);

  // Render the game (memoized to avoid recreating in effects unless deps change)
  const renderGame = useCallback(() => {
    // Prepare per-frame timing for sprite animations
    startFrameTiming();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw a grid for the top-down view
    drawGrid(ctx, canvas);
    // Create an offscreen canvas to draw the full scene first
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = canvas.width;
    offscreenCanvas.height = canvas.height;
    const offCtx = offscreenCanvas.getContext('2d');
    if (!offCtx) return;
    // Draw grid on the offscreen canvas
    drawGrid(offCtx, offscreenCanvas);
    // Draw boxes first so they appear as background obstacles
    boxes.forEach(box => { drawBox(offCtx, box); });
    const aiPlayers = aiManagerRef.current?.getAIPlayers() || [];
    aiPlayers.forEach(aiPlayer => {
      const aiVision = aiManagerRef.current?.getAIVision(aiPlayer.id);
      if (aiVision) {
        if (!aiPlayer.isDead) {
          drawAiVisionCone(
            offCtx,
            aiPlayer,
            aiVision.canSeePlayer,
            aiVision.visionConeAngle,
            aiVision.visionDistance,
            boxes,
            player
          );
        }
        if (!player.isDead && !aiPlayer.isDead && isPlayerBehindAI(player, aiPlayer, aiVision)) {
          offCtx.beginPath();
          offCtx.arc(aiPlayer.x, aiPlayer.y, aiPlayer.size + 8, 0, Math.PI * 2);
          offCtx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
          offCtx.lineWidth = 2;
          offCtx.setLineDash([4, 2]);
          offCtx.stroke();
          offCtx.setLineDash([]);
          offCtx.font = '12px Arial';
          offCtx.fillStyle = 'red';
          offCtx.textAlign = 'center';
          offCtx.fillText('Backstab!', aiPlayer.x, aiPlayer.y - aiPlayer.size - 10);
        }
      }
      drawPlayer(offCtx, aiPlayer);
    });
    if (player.isDead) {
      drawPlayerDeath(offCtx, player, deathAnimation.killedBy, deathAnimation.progress);
      if (deathAnimation.progress >= 0.5 && deathAnimation.progress < 1) {
        const overlayOpacity = (deathAnimation.progress - 0.5) * 2 * 0.5;
        offCtx.save();
        offCtx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
        offCtx.fillRect(0, 0, canvas.width, canvas.height);
        offCtx.restore();
      }
      ctx.drawImage(offscreenCanvas, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      if (player.vision) {
        const selfVisibilityRadius = player.size * 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, selfVisibilityRadius, 0, Math.PI * 2);
        const visionConeAngleRad = (player.vision.visionConeAngle * Math.PI) / 180;
        const baseAngle = player.rotation || 0;
        const startAngle = baseAngle - visionConeAngleRad / 2;
        const rayCount = 60;
        ctx.moveTo(player.x, player.y);
        for (let i = 0; i <= rayCount; i++) {
          const rayAngle = startAngle + (i / rayCount) * visionConeAngleRad;
          const dirX = Math.cos(rayAngle);
          const dirY = Math.sin(rayAngle);
          let rayLength = player.vision.visionDistance;
          for (const box of boxes) {
            const dist = rayBoxIntersection(player.x, player.y, dirX, dirY, box);
            if (dist !== null && dist < rayLength) { rayLength = dist; }
          }
          for (const aiPlayer of aiPlayers) {
            if (aiPlayer.isDead) continue;
            const aiBox = { ...aiPlayer, width: aiPlayer.size * 2, height: aiPlayer.size * 2, color: 'unused' };
            const dist = rayBoxIntersection(player.x, player.y, dirX, dirY, aiBox as Box);
            if (dist !== null && dist < rayLength) {
              const guaranteedVisibleDistance = 30;
              const extendedDistance = dist + guaranteedVisibleDistance;
              rayLength = Math.min(rayLength, extendedDistance);
            }
          }
          const endX = player.x + dirX * rayLength;
          const endY = player.y + dirY * rayLength;
          ctx.lineTo(endX, endY);
        }
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(offscreenCanvas, 0, 0);
        ctx.restore();
      }
      drawPlayer(ctx, player);
      if (graceActive) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(64, 196, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(64, 196, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('Shield Active', player.x, player.y - player.size - 10);
      }
      if (player.vision) {
        ctx.save();
        const visionConeAngleRad = (player.vision.visionConeAngle * Math.PI) / 180;
        const baseAngle = player.rotation || 0;
        const startAngle = baseAngle - visionConeAngleRad / 2;
        const endAngle = baseAngle + visionConeAngleRad / 2;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.arc(player.x, player.y, player.vision.visionDistance, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
      if (!graceActive && !player.isDead && player.vision) {
        ctx.save();
        const visionConeAngleRad = (player.vision.visionConeAngle * Math.PI) / 180;
        const baseAngle = player.rotation || 0;
        const blindSpotStartAngle = baseAngle + visionConeAngleRad / 2;
        const blindSpotEndAngle = baseAngle - visionConeAngleRad / 2 + 2 * Math.PI;
        const indicatorDistance = player.size * 2;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.arc(player.x, player.y, indicatorDistance, blindSpotStartAngle, blindSpotEndAngle);
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
        ctx.fill();
        ctx.restore();
      }
    }
  }, [boxes, player, deathAnimation.killedBy, deathAnimation.progress, graceActive]);

    // Game loop
  useEffect(() => {
    // Don't run game loop if game is not active
    if (!gameActive) return;
    
    let animationFrameId: number;
    let lastTime: number | null = null;
    
    const gameLoop = (time?: number) => {
      const now = time ?? performance.now();
      let deltaTimeSeconds = 1 / 60;
      if (lastTime !== null) {
        deltaTimeSeconds = (now - lastTime) / 1000;
        if (deltaTimeSeconds > 0.25) deltaTimeSeconds = 0.25; // safety clamp
      }
      lastTime = now;
      // Calculate time passed since last frame for AI Manager
      
      // Get all active AI players
      const aiPlayers = aiManagerRef.current?.getAIPlayers() || [];

      if (!player.isDead) {
        // Update player position with collision detection only if alive
        setPlayer(prevPlayer => {
          if (prevPlayer.isDead) return prevPlayer; // freeze
          const result = updatePlayer(
            prevPlayer,
            keysPressed,
            canvasRef.current,
            boxes,
            isMobile ? joystickInput : undefined,
            deltaTimeSeconds,
            ...aiPlayers
          );

          // Check if player collided with an AI bot, isn't already dead and not in grace period
          if (result.collidedWithAI && result.collidingAI && !prevPlayer.isDead && !graceActive) {
            const aiVision = aiManagerRef.current?.getAIVision(result.collidingAI.id);
            const isPlayerBehind = aiVision ? isPlayerBehindAI(prevPlayer, result.collidingAI, aiVision) : false;
            if (!isPlayerBehind) {
              setTimeout(() => handlePlayerDeath(result.collidingAI!), 0);
              return { ...result.updatedPlayer, isDead: true };
            }
          }
          return result.updatedPlayer;
        });
      }

      // Update AI only if player alive
      if (aiManagerRef.current && gameActive && !player.isDead) {
        // Use performance.now() for consistent timing with the AI Manager
  const currentTime = now; // reuse timestamp from RAF
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
      if (gameActive && (!player.isDead || (player.isDead && deathAnimation.progress < 1))) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };
    
  animationFrameId = requestAnimationFrame(gameLoop);
      return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [keysPressed, player, boxes, aiManagerConfig, gameActive, joystickInput, isMobile, deathAnimation.progress, graceActive, renderGame, handlePlayerDeath]);
  return (    <div ref={gameContainerRef} className="flex flex-col items-center w-full max-w-screen-xl mx-auto p-2 md:p-4 mobile-landscape-game">
      <div className="flex items-center justify-between w-full mb-3 md:mb-5 game-header">
        <h1 className="game-title text-xl md:text-2xl lg:text-3xl">Arena</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-pixel text-[10px] tracking-wide">
            <span className="opacity-70">DEFEATED</span>
            <span className="hud-counter text-sm">{defeatedEnemies}</span>
          </div>
          {isMobile && fullscreen.isSupported && (
            <button
              onClick={handleFullscreenToggle}
              className="btn-medieval px-2 py-2 text-[10px]"
              title={fullscreen.isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {fullscreen.isFullscreen ? "Exit" : "Full"}
            </button>
          )}
        </div>
      </div>
      <div className="relative panel w-full flex justify-center p-2 md:p-3">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={600}
          className="game-canvas block shadow-inner"
          style={{ 
            width: 'min(100vw - 2rem, 100%, 800px)',
            height: 'auto',
            aspectRatio: '4/3',
            maxHeight: 'min(75vh, 600px)'
          }}
        ></canvas>{attackCooldown && !player.isDead && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 hud-counter bg-black/70 !text-[var(--accent-glow)]">
            COOLING
          </div>
        )}
        {graceActive && !player.isDead && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 hud-counter text-[var(--success)]">
            SHIELD
          </div>
        )}
  {player.isDead && deathAnimation.overlayReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75">
            <h2 className="game-title text-5xl text-[var(--accent-glow)] mb-4 drop-shadow-[0_0_12px_rgba(255,77,57,0.5)]">Fallen</h2>
            <p className="font-pixel text-xs tracking-wide mb-6 opacity-80">Slain by an AI sentry</p>
            <div className="flex flex-col items-center gap-3">
              <button 
                className="btn-medieval btn-medieval--primary px-6 py-3"
                onClick={resetGame}
              >
                Rise Again
              </button>
              {onExitToMenu && (
                <button
                  className="btn-medieval px-6 py-3"
                  onClick={onExitToMenu}
                >
                  Main Menu
                </button>
              )}
            </div>
            <p className="font-pixel text-[10px] mt-5 opacity-60">Press SPACE to restart</p>
          </div>        )}
      </div>        {/* Mobile Controls */}
      <MobileControls
        onMovement={handleJoystickMove}
        onAttack={handleMobileAttack}
        isVisible={isMobile && gameActive}
        attackCooldown={attackCooldown}
        isPlayerDead={player.isDead || false}
        onFullscreenToggle={handleFullscreenToggle}
        isFullscreen={fullscreen.isFullscreen}
        fullscreenSupported={fullscreen.isSupported}
      />
    <div className="mt-3 md:mt-6 p-3 md:p-5 panel w-full max-w-4xl game-controls space-y-4">
      <div className="flex flex-col items-start mb-2">
      <h2 className="font-pixel text-xs tracking-wider text-[var(--gold)] mb-1">GAME CONTROLS</h2>
          
          {/* End of Game Controls container inner flex */}
        </div>
        {/* End of Game Controls outer container */}
        <ul className="list-disc pl-5 marker:text-[var(--accent)] text-sm">
          <li><span className="hud-counter">W</span> – Move Forward</li>
          <li><span className="hud-counter">S</span> – Move Backward</li>
          <li><span className="hud-counter">A</span> – Rotate Left</li>
          <li><span className="hud-counter">D</span> – Rotate Right</li>
          <li><span className="hud-counter">SPACE</span> – Attack (Backstab)</li>
        </ul>
        
        {isMobile && (
          <div className="mt-4 p-3 rounded-md bg-[var(--background-alt)]/60 border border-[var(--panel-border)]">
            <h3 className="font-pixel text-[10px] mb-2 tracking-wide text-[var(--gold)]">MOBILE</h3>
            <p className="text-xs opacity-80">Use the virtual joystick to move; tap the attack sigil to strike. Movement also sets your facing.</p>
          </div>
        )}
        <div className="mt-4 p-3 rounded-md bg-[var(--danger-bg)] border border-[var(--panel-border)]">
          <h3 className="font-pixel text-[10px] mb-2 tracking-wide text-[var(--accent-glow)]">BACKSTABBING</h3>
            <p className="text-xs opacity-80 leading-relaxed">Circle behind sentries (outside their cone). When a target is vulnerable a crimson ring appears—strike to fell them instantly.</p>
        </div>
      </div>
    </div>
  );
};

export default Game;