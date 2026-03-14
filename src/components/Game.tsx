import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Player, Box, Item, PlayerEffect, AIManagerConfig } from './game/types';
import { drawGrid, drawAiVisionCone, drawPlayer, drawBox, drawPlayerDeath, rayBoxIntersection, startFrameTiming, drawTileMap, drawItem } from './game/rendering';
import { updatePlayer, isPlayerBehindAI } from './game/HumanPlayer';
import { checkAiVision } from './game/AIPlayer';
import { AIManager } from './game/AIManager';
import MobileControls from './game/MobileControls';
import { useIsMobile } from './game/useIsMobile';
import { useFullscreen } from './game/useFullscreen';
import { useOrientation } from './game/useOrientation';
import { generateMapLayout, getUserSpawnPoint, loadMapFromTiled, hasTiledMapLoaded, getTiledMapBoxes, MAP_CONFIG } from './game/MapLayout';
import { debugSpriteLoading } from '../utils/debugSprites';

interface GameProps {
  onExitToMenu?: () => void;
}

const Game: React.FC<GameProps> = ({ onExitToMenu }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Reusable offscreen canvas to avoid per-frame allocations
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  // Simple perf stats
  const frameCountRef = useRef<number>(0);
  const lastFpsSampleRef = useRef<number>(performance.now());
  const [fps, setFps] = useState<number>(0);
  
  // Get user spawn point from map layout
  const userSpawn = getUserSpawnPoint();
    // Human-controlled player
  const initialPlayer: Player = {
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
  };
  const [player, setPlayer] = useState<Player>(initialPlayer);// AI Manager configuration
  const [aiManagerConfig, setAiManagerConfig] = useState<AIManagerConfig>({
    maxBots: MAP_CONFIG.maxBots || 2, // will sync after map load
    spawnLocation: { x: 200, y: 200 }, // This will be overridden by the MapLayout system
    minSpawnDelay: 3000, // Min 3 seconds between spawns
    maxSpawnDelay: 6000, // Max 6 seconds between spawns
    enabled: true // AI spawning enabled by default
  });
  
  // AI Manager reference
  const aiManagerRef = useRef<AIManager | null>(null);
  
  // Create walls using the fixed map layout
  const [boxes, setBoxes] = useState<Box[]>([]);
  // Items on the map
  const [items, setItems] = useState<Item[]>([]);
  // Pending items that will spawn after delay
  const [pendingItems, setPendingItems] = useState<Array<{item: Item, spawnTime: number}>>([]);
  // Refs mirroring frequently updated objects to avoid effect churn
  const playerRef = useRef<Player>(initialPlayer);
  const boxesRef = useRef<Box[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const pendingItemsRef = useRef<Array<{item: Item, spawnTime: number}>>([]);
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { boxesRef.current = boxes; }, [boxes]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { pendingItemsRef.current = pendingItems; }, [pendingItems]);
  
  // Sync active effects for UI display
  useEffect(() => {
    setActiveEffects(player.effects || []);
  }, [player.effects]);
  
  // Track attack cooldown
  const [attackCooldown, setAttackCooldown] = useState<boolean>(false);
  
  // Track defeated enemies for scoring
  const [defeatedEnemies, setDefeatedEnemies] = useState<number>(0);
  
  // Track active effects for UI display
  const [activeEffects, setActiveEffects] = useState<PlayerEffect[]>([]);
  
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
    
    // Check if player has green flame effect (one-hit from any direction)
    const hasGreenFlame = player.effects?.some(e => e.type === 'greenFlame');
    
    // Check each AI bot to see if player can backstab it
    for (const aiPlayer of aiPlayers) {
      if (aiPlayer.isDead) continue; // skip corpses
      const aiVision = aiManagerRef.current.getAIVision(aiPlayer.id);

      // Green flame: defeat from any direction if close enough
      if (hasGreenFlame) {
        const dist = Math.sqrt((player.x - aiPlayer.x) ** 2 + (player.y - aiPlayer.y) ** 2);
        if (dist < player.size + aiPlayer.size + 5) {
          aiManagerRef.current.markAIDead(aiPlayer.id);
          setDefeatedEnemies(prev => prev + 1);
          break;
        }
      } else if (aiVision && isPlayerBehindAI(player, aiPlayer, aiVision)) {
        // Player is behind AI and within backstabbing range
        aiManagerRef.current.markAIDead(aiPlayer.id);
        
        // Drop an item on backstab kill
        if (Math.random() < 1.0) {
          const dropRoll = Math.random();
          let itemType: 'speedPotion' | 'greenFlame' = 'speedPotion';
          let spriteIndex = 0;

          if (dropRoll < 0.2) {           // ~20% chance for Emerald Inferno
            itemType = 'greenFlame';
            spriteIndex = 1;              // second sprite in items.png
          } else {                        // remaining chance for speed potion
            itemType = 'speedPotion';
            spriteIndex = 0;
          }

          const newItem: Item = {
            id: `item_${Date.now()}_${Math.random()}`,
            x: aiPlayer.x,
            y: aiPlayer.y,
            direction: 'none',
            speed: 0,
            size: 32,
            pulse: 0,
            rotation: 0,
            rotationSpeed: 0,
            type: itemType,
            spriteIndex: spriteIndex
          };
          setPendingItems(prev => [...prev, { item: newItem, spawnTime: performance.now() + 1500 }]);
        }
        
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
  }, [player.isDead]);
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
    
    // Reapply map (prefer Tiled map if loaded)
    if (hasTiledMapLoaded()) {
      setBoxes(getTiledMapBoxes());
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        setBoxes(generateMapLayout(canvas.width, canvas.height));
      } else {
        setBoxes(generateMapLayout());
      }
    }
    
    // Play a restart sound if available
    const restartSound = new Audio('/death-sound.mp3');
    restartSound.volume = 0.3;
    restartSound.play().catch(e => console.log('Could not play restart sound', e));
  }, [deathAnimation.animationFrameId, aiManagerConfig]);  // Initialize map layout and AI Manager when component mounts
  useEffect(() => {
    // Initial one-time map load & AI manager creation. Previous implementation depended on aiManagerConfig
    // and re-ran on every config update, constantly recreating the manager & reloading the map (freeze/regression).
    let cancelled = false;
    loadMapFromTiled('maps/arena_large.tmj')
      .then((walls: Box[]) => {
        if (cancelled) return;
        setBoxes(walls);
        const spawn = getUserSpawnPoint();
        setPlayer(prev => ({ ...prev, x: spawn.x, y: spawn.y }));
        if (typeof window !== 'undefined') {
          (window as unknown as { MAP_CONFIG?: typeof MAP_CONFIG }).MAP_CONFIG = MAP_CONFIG;
        }
        // Sync maxBots from loaded map only once here; further dynamic changes come from MapLayout if needed.
        setAiManagerConfig(prev => {
          const next = { ...prev, maxBots: MAP_CONFIG.maxBots || prev.maxBots };
          return next;
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('Tiled map load failed, using static layout:', err);
        setBoxes(generateMapLayout());
        if (typeof window !== 'undefined') {
          (window as unknown as { MAP_CONFIG?: typeof MAP_CONFIG }).MAP_CONFIG = MAP_CONFIG;
        }
        setAiManagerConfig(prev => ({ ...prev, maxBots: MAP_CONFIG.maxBots || prev.maxBots }));
      });

    if (typeof window !== 'undefined') {
      debugSpriteLoading().then((workingPaths) => {
        if (workingPaths) {
          console.log('Sprite system ready with paths:', workingPaths);
        } else {
          console.log('Sprite system will use procedural generation');
        }
      });
    }

    if (!aiManagerRef.current) {
      // Use current (possibly soon-to-be-updated) config; it will be patched by separate config effect below.
      console.log('[Game] Initializing AI Manager once with config:', aiManagerConfig);
      aiManagerRef.current = new AIManager(aiManagerConfig);
      if (typeof window !== 'undefined') {
        (window as unknown as { MAP_CONFIG?: typeof MAP_CONFIG }).MAP_CONFIG = MAP_CONFIG;
      }
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time init
  }, []);
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- Camera calculation (scrolling world) ---
  // Map pixel dimensions (world size) from Tiled (may differ from viewport)
  const mapWidth = MAP_CONFIG.width; // world width
  const mapHeight = MAP_CONFIG.height; // world height
  const viewW = canvas.width;   // fixed viewport width
  const viewH = canvas.height;  // fixed viewport height
  // Center camera on player but clamp to map bounds
  const p = playerRef.current;
  let cameraX = p.x - viewW / 2;
  let cameraY = p.y - viewH / 2;
  if (cameraX < 0) cameraX = 0;
  if (cameraY < 0) cameraY = 0;
  if (cameraX > mapWidth - viewW) cameraX = Math.max(0, mapWidth - viewW);
  if (cameraY > mapHeight - viewH) cameraY = Math.max(0, mapHeight - viewH);
  const pvx = p.x - cameraX; // player viewport X
  const pvy = p.y - cameraY; // player viewport Y

  // Reusable offscreen canvas (tilemap + actors)
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = canvas.width;
      offscreenCanvasRef.current.height = canvas.height;
      offscreenCtxRef.current = offscreenCanvasRef.current.getContext('2d');
    } else if (offscreenCanvasRef.current.width !== canvas.width || offscreenCanvasRef.current.height !== canvas.height) {
      offscreenCanvasRef.current.width = canvas.width;
      offscreenCanvasRef.current.height = canvas.height;
    }
    const offCtx = offscreenCtxRef.current || offscreenCanvasRef.current.getContext('2d');
    if (!offCtx) return;
    offCtx.clearRect(0, 0, offscreenCanvasRef.current.width, offscreenCanvasRef.current.height);
  // Draw world translated so that camera view is captured into 0,0..viewW,viewH
  offCtx.save();
  offCtx.translate(-cameraX, -cameraY);
  const tileDrawn = drawTileMap(offCtx); // draws full map; translation selects visible window
  if (!tileDrawn && offscreenCanvasRef.current) drawGrid(offCtx, offscreenCanvasRef.current);
    // Draw boxes first so they appear as background obstacles
  boxesRef.current.forEach(box => { drawBox(offCtx, box); });
    // Draw items
  itemsRef.current.forEach(item => { drawItem(offCtx, item); });
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
      boxesRef.current,
      p
          );
        }
    if (!p.isDead && !aiPlayer.isDead && isPlayerBehindAI(p, aiPlayer, aiVision)) {
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
    offCtx.restore(); // end world translation
    if (player.isDead) {
      // Draw death animation onto world layer with translation
      offCtx.save();
      offCtx.translate(-cameraX, -cameraY);
  drawPlayerDeath(offCtx, p, deathAnimation.killedBy, deathAnimation.progress);
      offCtx.restore();
      if (deathAnimation.progress >= 0.5 && deathAnimation.progress < 1) {
        const overlayOpacity = (deathAnimation.progress - 0.5) * 2 * 0.5;
        offCtx.save();
        offCtx.fillStyle = `rgba(0, 0, 0, ${overlayOpacity})`;
        offCtx.fillRect(0, 0, canvas.width, canvas.height);
        offCtx.restore();
      }
  ctx.drawImage(offscreenCanvasRef.current, 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      if (p.vision) {
        // Create vision mask with fading edges
        const visionMaskCanvas = document.createElement('canvas');
        visionMaskCanvas.width = canvas.width;
        visionMaskCanvas.height = canvas.height;
        const visionCtx = visionMaskCanvas.getContext('2d');
        if (visionCtx) {
          // Create radial gradient for fading effect within the cone
          const gradient = visionCtx.createRadialGradient(pvx, pvy, 0, pvx, pvy, p.vision.visionDistance);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Fully opaque at center
          gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.6)'); // Start fading
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Fully transparent at edge
          
          visionCtx.fillStyle = gradient;
          
          // Draw vision cone shape on mask
          const visionConeAngleRad = (p.vision.visionConeAngle * Math.PI) / 180;
          const baseAngle = p.rotation || 0;
          const startAngle = baseAngle - visionConeAngleRad / 2;
          const rayCount = 60;
          
          visionCtx.beginPath();
          visionCtx.moveTo(pvx, pvy);
          
          for (let i = 0; i <= rayCount; i++) {
            const rayAngle = startAngle + (i / rayCount) * visionConeAngleRad;
            const dirX = Math.cos(rayAngle);
            const dirY = Math.sin(rayAngle);
            let rayLength = p.vision.visionDistance;
            
            // Check intersections with boxes
            for (const box of boxesRef.current) {
              const dist = rayBoxIntersection(p.x, p.y, dirX, dirY, box);
              if (dist !== null && dist < rayLength) { 
                rayLength = Math.min(rayLength, dist + 8); // Show a tiny bit of wall
              }
            }
            
            // Check intersections with AI players
            for (const aiPlayer of aiPlayers) {
              if (aiPlayer.isDead) continue;
              const aiBox = { ...aiPlayer, width: aiPlayer.size * 2, height: aiPlayer.size * 2, color: 'unused' };
              const dist = rayBoxIntersection(p.x, p.y, dirX, dirY, aiBox as Box);
              if (dist !== null && dist < rayLength) {
                const guaranteedVisibleDistance = 30;
                const extendedDistance = dist + guaranteedVisibleDistance;
                rayLength = Math.min(rayLength, extendedDistance);
              }
            }
            
            const endX = p.x + dirX * rayLength;
            const endY = p.y + dirY * rayLength;
            visionCtx.lineTo(endX - cameraX, endY - cameraY);
          }
          
          visionCtx.closePath();
          visionCtx.fill();
          
          // Also add a small circle around the player for self-visibility
          visionCtx.beginPath();
          visionCtx.arc(pvx, pvy, p.size * 2, 0, Math.PI * 2);
          visionCtx.fill();
        }
        
        // Draw the offscreen canvas content
        ctx.drawImage(offscreenCanvasRef.current, 0, 0);
        
        // Apply vision mask using destination-in to clip and fade
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(visionMaskCanvas, 0, 0);
        
        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';
      } else {
        // No vision - draw normally
        ctx.drawImage(offscreenCanvasRef.current, 0, 0);
      }
      ctx.restore();
      // Ensure player always visible (draw over mask) using translation
      ctx.save();
      ctx.translate(-cameraX, -cameraY);
  drawPlayer(ctx, p);
      ctx.restore();
      if (graceActive) {
        ctx.beginPath();
        ctx.arc(pvx, pvy, p.size + 8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(64, 196, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(64, 196, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText('Shield Active', pvx, pvy - p.size - 10);
      }
      if (p.vision) {
        ctx.save();
        const visionConeAngleRad = (p.vision.visionConeAngle * Math.PI) / 180;
        const baseAngle = p.rotation || 0;
        const startAngle = baseAngle - visionConeAngleRad / 2;
        const endAngle = baseAngle + visionConeAngleRad / 2;
        ctx.beginPath();
        ctx.moveTo(pvx, pvy);
        ctx.arc(pvx, pvy, p.vision!.visionDistance, startAngle, endAngle);
        ctx.closePath();
        ctx.restore();
      }
    }
    frameCountRef.current += 1;
    const nowPerf = performance.now();
    if (nowPerf - lastFpsSampleRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFpsSampleRef.current = nowPerf;
    }
  }, [deathAnimation.killedBy, deathAnimation.progress, graceActive, playerRef, player.isDead]);

    // Game loop
  useEffect(() => {
    // Don't run game loop if game is not active
    if (!gameActive) return;
    
    let animationFrameId: number;
    let lastTime: number | null = null;
    
    const gameLoop = (time?: number) => {
      try {
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

  if (!playerRef.current.isDead) {
        // Update player position with collision detection only if alive
        setPlayer(prevPlayer => {
          if (prevPlayer.isDead) return prevPlayer; // freeze
          const result = updatePlayer(
            prevPlayer,
            keysPressed,
            canvasRef.current,
    boxesRef.current,
            isMobile ? joystickInput : undefined,
            deltaTimeSeconds,
            ...aiPlayers
          );

          // Check if player collided with an AI bot, isn't already dead and not in grace period
          if (result.collidedWithAI && result.collidingAI && !prevPlayer.isDead && !graceActive) {
            const aiVision = aiManagerRef.current?.getAIVision(result.collidingAI.id);
            if (aiVision) {
              const visionResult = checkAiVision(result.collidingAI, prevPlayer, aiVision, boxesRef.current);
              if (visionResult.canSeePlayer) {
                setTimeout(() => handlePlayerDeath(result.collidingAI!), 0);
                return { ...result.updatedPlayer, isDead: true };
              }
            }
          }
          return result.updatedPlayer;
        });

        // Check for item pickups
        setItems(prevItems => {
          const remainingItems = prevItems.filter(item => {
            const dx = playerRef.current.x - item.x;
            const dy = playerRef.current.y - item.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < (playerRef.current.size + item.size) / 2) {
              // Pickup item
              if (item.type === 'speedPotion') {
                setPlayer(prevPlayer => {
                  // Check if speed boost is already active
                  const hasSpeedBoost = prevPlayer.effects?.some(effect => effect.type === 'speedBoost');
                  if (hasSpeedBoost) {
                    // Reset duration of existing speed boost instead of stacking
                    return {
                      ...prevPlayer,
                      effects: prevPlayer.effects?.map(effect => 
                        effect.type === 'speedBoost' 
                          ? { ...effect, duration: 10 } // Reset to 10 seconds
                          : effect
                      )
                    };
                  } else {
                    // Add new speed boost
                    return {
                      ...prevPlayer,
                      effects: [...(prevPlayer.effects || []), {
                        type: 'speedBoost',
                        duration: 10, // 10 seconds
                        multiplier: 1.2 // 20% increase
                      }]
                    };
                  }
                });
              }
              if (item.type === 'greenFlame') {
                setPlayer(prevPlayer => {
                  const hasGreenFlame = prevPlayer.effects?.some(e => e.type === 'greenFlame');
                  if (hasGreenFlame) {
                    return {
                      ...prevPlayer,
                      effects: prevPlayer.effects?.map(e =>
                        e.type === 'greenFlame' ? { ...e, duration: 10 } : e
                      )
                    };
                  }
                  return {
                    ...prevPlayer,
                    effects: [...(prevPlayer.effects || []), {
                      type: 'greenFlame' as const,
                      duration: 10,
                      multiplier: 1 // not used for speed, kept for interface compat
                    }]
                  };
                });
              }
              return false; // Remove item
            }
            return true; // Keep item
          });
          return remainingItems;
        });
      }

      // Update AI only if player alive
    if (aiManagerRef.current && gameActive && !playerRef.current.isDead) {
        // Use performance.now() for consistent timing with the AI Manager
  const currentTime = now; // reuse timestamp from RAF
        aiManagerRef.current.updateAllAIPlayers(
      playerRef.current,
          canvasRef.current,
      boxesRef.current,
          currentTime
        );
      }

      // Update player effects
      setPlayer(prevPlayer => {
        if (!prevPlayer.effects || prevPlayer.effects.length === 0) return prevPlayer;
        const updatedEffects = prevPlayer.effects
          .map(effect => ({ ...effect, duration: effect.duration - deltaTimeSeconds }))
          .filter(effect => effect.duration > 0);
        return { ...prevPlayer, effects: updatedEffects };
      });

      // Check for pending items ready to spawn
      setPendingItems(prevPending => {
        const now = performance.now();
        const readyItems = prevPending.filter(pending => pending.spawnTime <= now);
        if (readyItems.length > 0) {
          setItems(prevItems => [...prevItems, ...readyItems.map(p => p.item)]);
        }
        return prevPending.filter(pending => pending.spawnTime > now);
      });
      
      // Render game
  renderGame();
      
      // Continue the game loop if game is active
      if (gameActive && (!playerRef.current.isDead || (playerRef.current.isDead && deathAnimation.progress < 1))) {
        animationFrameId = requestAnimationFrame(gameLoop);
      }
      } catch (err) {
        console.error('[GameLoop] fatal frame error', err);
        // Attempt to keep loop alive
        animationFrameId = requestAnimationFrame(gameLoop);
      }
    };
    
  animationFrameId = requestAnimationFrame(gameLoop);
      return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [keysPressed, aiManagerConfig, gameActive, joystickInput, isMobile, deathAnimation.progress, graceActive, renderGame, handlePlayerDeath]);
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
        ></canvas>
        {/* Debug overlay */}
        <div style={{position:'absolute',left:8,top:8,font:'10px monospace',color:'#0f0',background:'rgba(0,0,0,0.35)',padding:'2px 4px',borderRadius:3}}>
          FPS {fps}
        </div>
        {attackCooldown && !player.isDead && (
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
        {/* Active Effects Status Bar */}
        {activeEffects.length > 0 && !player.isDead && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex gap-4">
            {activeEffects.map((effect, index) => (
              <div key={index} className="flex items-center gap-2 bg-black/70 px-3 py-1 rounded border border-[var(--panel-border)]">
                <span className="font-pixel text-[10px] tracking-wide" style={{ color: effect.type === 'greenFlame' ? '#00ff50' : 'var(--gold)' }}>
                  {effect.type === 'greenFlame' ? 'EMERALD INFERNO' : 'SPEED POTION'}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-12 h-2 bg-[var(--background-alt)] border border-[var(--panel-border)] rounded">
                    <div 
                      className="h-full bg-[var(--accent-glow)] rounded transition-all duration-100"
                      style={{ width: `${(effect.duration / 10) * 100}%` }}
                    ></div>
                  </div>
                  <span className="hud-counter text-xs min-w-[20px]">
                    {Math.ceil(effect.duration)}s
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
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