import { Player, Box } from './types';
import { directionColors, aiDirectionColors } from './constants';
import { 
  CharacterSprite, 
  createCharacterSpriteFromImage, 
  createEnemySpriteFromImage,
  preloadAllSprites 
} from './sprites';
import { getTileMap } from './MapLayout';

// Helper function to draw grid
export const drawGrid = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
  // Get grid color from CSS variables
  const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim() || '#EEEEEE';
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  
  // Set canvas background
  const canvasBg = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#f0f0f0';
  ctx.fillStyle = canvasBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const tileMap = getTileMap();
  const cell = tileMap ? tileMap.tileWidth : 40;
  // Vertical lines
  for (let x = 0; x < canvas.width; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y < canvas.height; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
};

// ---- Tile Map Rendering (tiles.png first= floor, second= wall) ----
let tileSheet: HTMLImageElement | null = null;
let tileSheetLoaded = false;
let tileSheetLoadingStarted = false;
let cachedTileCanvas: HTMLCanvasElement | null = null;
let cachedTileKey = '';

// Synchronous tilemap draw attempt. Returns true if tile layer drawn (from cache), false otherwise.
// If resources aren't ready yet it will kick off loading and future frames will succeed automatically.
export const drawTileMap = (ctx: CanvasRenderingContext2D): boolean => {
  const tm = getTileMap();
  if (!tm) return false; // map not yet parsed

  const key = `${tm.width}x${tm.height}x${tm.tileWidth}`;
  if (cachedTileCanvas && cachedTileKey === key) {
    ctx.drawImage(cachedTileCanvas, 0, 0);
    return true;
  }

  // Begin loading sprite sheet if not started
  if (!tileSheetLoadingStarted) {
    tileSheetLoadingStarted = true;
    tileSheet = new Image();
    tileSheet.onload = () => {
      tileSheetLoaded = true;
      // Build cached canvas immediately on load if map still available
      const current = getTileMap();
      if (!current) return;
      buildTileCache(current);
    };
    tileSheet.onerror = (e) => {
      console.error('Failed to load tile sheet /sprites/tiles.png', e);
    };
    tileSheet.src = '/sprites/tiles.png';
  }

  // If sheet loaded but cache not built yet, build now
  if (tileSheetLoaded && tileSheet && !cachedTileCanvas) {
    buildTileCache(tm);
    if (cachedTileCanvas) {
      ctx.drawImage(cachedTileCanvas, 0, 0);
      return true;
    }
  }

  return false; // not ready this frame
};

function buildTileCache(tm: ReturnType<typeof getTileMap>) {
  if (!tm || !tileSheet) return;
  const key = `${tm.width}x${tm.height}x${tm.tileWidth}`;
  const off = document.createElement('canvas');
  off.width = tm.width * tm.tileWidth;
  off.height = tm.height * tm.tileHeight;
  const octx = off.getContext('2d');
  if (!octx) return;
  const cols = Math.floor(tileSheet.width / tm.tileWidth);
  for (let y = 0; y < tm.height; y++) {
    for (let x = 0; x < tm.width; x++) {
      const gid = tm.data[y * tm.width + x];
      if (gid <= 0) continue;
      const tileIndex = gid - 1;
      const sx = (tileIndex % cols) * tm.tileWidth;
      const sy = Math.floor(tileIndex / cols) * tm.tileHeight;
      octx.drawImage(tileSheet, sx, sy, tm.tileWidth, tm.tileHeight, x * tm.tileWidth, y * tm.tileHeight, tm.tileWidth, tm.tileHeight);
    }
  }
  cachedTileCanvas = off;
  cachedTileKey = key;
}

// Helper function to draw boxes
export const drawBox = (ctx: CanvasRenderingContext2D, box: Box) => {
  const pulseSize = box.pulse ? Math.sin(box.pulse) * 2 : 0;
  
  // Get border color from CSS variables
  const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#333333';
  
  // Draw the box
  ctx.beginPath();
  ctx.rect(
    box.x - box.width / 2 - pulseSize / 2,
    box.y - box.height / 2 - pulseSize / 2,
    box.width + pulseSize,
    box.height + pulseSize
  );
  ctx.fillStyle = box.color;
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();
};

// Function to check if a ray intersects with a box and returns the distance to intersection
export const rayBoxIntersection = (
  x0: number, y0: number, // Ray origin
  dirX: number, dirY: number, // Ray direction (normalized)
  box: Box
): number | null => {
  // Box bounds
  const left = box.x - box.width / 2;
  const right = box.x + box.width / 2;
  const top = box.y - box.height / 2;
  const bottom = box.y + box.height / 2;
  
  // Calculate inverse of direction to avoid division
  const invDirX = dirX !== 0 ? 1.0 / dirX : Infinity;
  const invDirY = dirY !== 0 ? 1.0 / dirY : Infinity;
  
  // Calculate intersections with rectangle bounds
  const txMin = (left - x0) * invDirX;
  const txMax = (right - x0) * invDirX;
  
  // Get min and max intersections on x-axis
  let tMin = Math.min(txMin, txMax);
  let tMax = Math.max(txMin, txMax);
  
  const tyMin = (top - y0) * invDirY;
  const tyMax = (bottom - y0) * invDirY;
  
  // Find the intersection of the ranges
  tMin = Math.max(tMin, Math.min(tyMin, tyMax));
  tMax = Math.min(tMax, Math.max(tyMin, tyMax));
  
  // If tMax < 0, ray intersects box, but entire box is behind the ray origin
  // If tMin > tMax, ray doesn't intersect box
  if (tMax < 0 || tMin > tMax) {
    return null;
  }
  
  // Return the distance to the intersection, but only if it's in front of the ray origin
  return tMin > 0 ? tMin : tMax;
};

// Helper function to draw AI vision cone with proper obstacle occlusion
export const drawAiVisionCone = (
  ctx: CanvasRenderingContext2D, 
  aiPlayer: Player, 
  canSeePlayer: boolean, 
  visionConeAngle: number, 
  visionDistance: number,
  boxes: Box[] = [],
  player?: Player
) => {
  if (aiPlayer.direction === 'none') return;
  
  // Calculate the cone angle in radians
  const coneAngleRad = (visionConeAngle * Math.PI) / 180;
  
  // Use the rotation property directly to determine vision cone orientation
  const baseAngle = aiPlayer.rotation || 0;
  
  // Calculate the start and end angles for the cone
  const startAngle = baseAngle - coneAngleRad / 2;
  
  // Number of rays to cast
  const rayCount = 60; // Higher = better quality but lower performance
  
  // Save context state
  ctx.save();
  
  // Prepare to draw the vision cone using rays
  ctx.beginPath();
  ctx.moveTo(aiPlayer.x, aiPlayer.y);
  
  // Cast rays around the vision cone to create the polygon shape
  for (let i = 0; i <= rayCount; i++) {
    const rayAngle = startAngle + (i / rayCount) * coneAngleRad;
    
    // Calculate ray direction vector (normalized)
    const dirX = Math.cos(rayAngle);
    const dirY = Math.sin(rayAngle);
    
    // Initialize rayLength to the vision distance
    let rayLength = visionDistance;
    
    // Check intersection with each box and update rayLength if needed
    for (const box of boxes) {
      const dist = rayBoxIntersection(aiPlayer.x, aiPlayer.y, dirX, dirY, box);
      if (dist !== null && dist < rayLength) {
        rayLength = dist;
      }
    }
    
    // Also check if player blocks the ray (if provided and not the target)
    if (player && player.id !== aiPlayer.id) {
      // Create a box representation of the player for intersection test
      const playerBox: Box = {
        ...player,
        width: player.size * 2,
        height: player.size * 2,
        color: 'unused'
      };
      
      const dist = rayBoxIntersection(aiPlayer.x, aiPlayer.y, dirX, dirY, playerBox);
      if (dist !== null && dist < rayLength) {
        rayLength = dist;
      }
    }
    
    // Calculate the endpoint of the ray
    const endX = aiPlayer.x + dirX * rayLength;
    const endY = aiPlayer.y + dirY * rayLength;
    
    // Draw line to the endpoint
    ctx.lineTo(endX, endY);
  }
  
  // Close the path back to the AI player position
  ctx.closePath();
  
  // Fill the vision cone with a semi-transparent color
  const fillColor = canSeePlayer ? 'rgba(255, 100, 100, 0.2)' : 'rgba(100, 150, 255, 0.2)';
  ctx.fillStyle = fillColor;
  ctx.fill();
  
  // Draw the vision cone border
  ctx.strokeStyle = canSeePlayer ? 'rgba(255, 50, 50, 0.5)' : 'rgba(50, 100, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Restore the context
  ctx.restore();
};

// Helper function to draw player's vision cone
export const drawPlayerVisionCone = (
  ctx: CanvasRenderingContext2D, 
  player: Player, 
  visionConeAngle: number, 
  visionDistance: number,
  boxes: Box[] = [],
  otherPlayers: Player[] = []
) => {
  if (player.direction === 'none') return;
  
  // Calculate the cone angle in radians
  const coneAngleRad = (visionConeAngle * Math.PI) / 180;
  
  // Use the rotation property directly to determine vision cone orientation
  const baseAngle = player.rotation || 0;
  
  // Calculate the start and end angles for the cone
  const startAngle = baseAngle - coneAngleRad / 2;
  
  // Number of rays to cast
  const rayCount = 60; // Higher = better quality but lower performance
  
  // Save context state
  ctx.save();
  
  // Prepare to draw the vision cone using rays
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  
  // Cast rays around the vision cone to create the polygon shape
  for (let i = 0; i <= rayCount; i++) {
    const rayAngle = startAngle + (i / rayCount) * coneAngleRad;
    
    // Calculate ray direction vector (normalized)
    const dirX = Math.cos(rayAngle);
    const dirY = Math.sin(rayAngle);
    
    // Initialize rayLength to the vision distance
    let rayLength = visionDistance;
    
    // Check intersection with each box and update rayLength if needed
    for (const box of boxes) {
      const dist = rayBoxIntersection(player.x, player.y, dirX, dirY, box);
      if (dist !== null && dist < rayLength) {
        rayLength = dist;
      }
    }
    
    // Check intersection with other players (AI)
    for (const otherPlayer of otherPlayers) {
      if (otherPlayer.id !== player.id) {
        // Create a box representation of the player for intersection test
        const playerBox: Box = {
          ...otherPlayer,
          width: otherPlayer.size * 2,
          height: otherPlayer.size * 2,
          color: 'unused'
        };
        
        const dist = rayBoxIntersection(player.x, player.y, dirX, dirY, playerBox);
        if (dist !== null && dist < rayLength) {
          rayLength = dist;
        }
      }
    }
    
    // Calculate the endpoint of the ray
    const endX = player.x + dirX * rayLength;
    const endY = player.y + dirY * rayLength;
    
    // Draw line to the endpoint
    ctx.lineTo(endX, endY);
  }
  
  // Close the path back to the player position
  ctx.closePath();
  
  // Return the path for later use
  return ctx.isPointInPath;
};

// Initialize sprite system
let characterSprite: CharacterSprite | null = null;
let enemySprite: CharacterSprite | null = null;
// Per-frame timing (prevents multiple sprites in same frame from shrinking deltaTime)
let lastFrameTime: number | null = null;
let frameDeltaTime: number = 16; // default ~60fps

// Call this once per rendered frame (before drawing any players)
export const startFrameTiming = () => {
  const now = performance.now();
  if (lastFrameTime === null) {
    frameDeltaTime = 16; // first frame default
  } else {
    frameDeltaTime = now - lastFrameTime;
    // Clamp unreasonable delta spikes (e.g., tab inactive) to avoid frame jumps
    if (frameDeltaTime > 250) frameDeltaTime = 250;
    if (frameDeltaTime < 0) frameDeltaTime = 0; // guard against clock issues
  }
  lastFrameTime = now;
};
let spritesPreloaded: { character: boolean; enemy: boolean } = { character: false, enemy: false };

// Preload sprite images for better deployment compatibility
const preloadSprites = async () => {
  if (!spritesPreloaded.character || !spritesPreloaded.enemy) {
    const results = await preloadAllSprites();
    spritesPreloaded = results;
    
    if (results.character && results.enemy) {
      console.log('All sprites preloaded successfully');
    } else {
      console.warn(`Sprite preloading results - Character: ${results.character}, Enemy: ${results.enemy}`);
    }
  }
};

// Initialize character sprite on first use
const initializeSprites = async () => {
  if (!characterSprite || !enemySprite) {
    // Preload sprites first
    await preloadSprites();
    
    // Initialize character sprite
    if (!characterSprite) {
      characterSprite = createCharacterSpriteFromImage('/sprites/charactersprites.png', {
        frameWidth: 32,
        frameHeight: 32,
        frameCount: 17, // 17 movement frames
        animationSpeed: 30, // Faster walking animation
        spriteType: 'character'
      });
    }
    
    // Initialize enemy sprite
    if (!enemySprite) {
      enemySprite = createEnemySpriteFromImage('/sprites/enemysprites.png', {
        frameWidth: 32,
        frameHeight: 32,
        frameCount: 17,
        animationSpeed: 18, // slower enemy animation (kept in sync with sprites.ts constant)
        spriteType: 'enemy'
      });
    }
  }
};

// Helper function to draw player with sprite
export const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, useSprites: boolean = true) => {
  if (useSprites) {
    // Initialize sprite system if needed (non-blocking)
    if (!characterSprite || !enemySprite) {
      initializeSprites(); // async fire-and-forget
    }

    // Use per-frame delta time prepared by startFrameTiming()
    const deltaTime = frameDeltaTime;

    // Fallback: if startFrameTiming wasn't called this frame, approximate
    if (lastFrameTime === null) {
      // Initialize timing baseline
      startFrameTiming();
    }

    // Choose the appropriate sprite based on whether this is an AI player
    const sprite = (p.isAI || false) ? enemySprite : characterSprite;

    // Use sprite rendering
    if (sprite) {
      // Handle death animation for AI enemies (4th column, 6 frames)
      if (p.isAI && p.isDead && sprite.getImage) {
        const img: HTMLImageElement | null = sprite.getImage();
        const cfg = sprite.getConfig?.();
        if (img && cfg) {
          const frameWidth = cfg.frameWidth;
          const frameHeight = cfg.frameHeight;
          const deathFrames = 6; // rows
          const columnIndex = 3; // 4th column
          const progress = p.deathAnimationProgress ?? 0;
          const rawFrame = progress >= 1 ? deathFrames - 1 : Math.min(deathFrames - 1, Math.floor(progress * deathFrames));
          const sx = frameWidth * columnIndex;
          const sy = frameHeight * rawFrame;
          const destSize = p.size * 2.5;
          const destX = p.x - destSize / 2;
          const destY = p.y - destSize / 2;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation + Math.PI / 2);
          ctx.translate(-p.x, -p.y);
          ctx.drawImage(img, sx, sy, frameWidth, frameHeight, destX, destY, destSize, destSize);
          ctx.restore();
          return; // done drawing dead enemy
        }
      }
  sprite.render(ctx, p, deltaTime, p.isAI || false);
  // Direction arrow intentionally removed
      
      return; // Skip the old circle rendering
    }
  }
  
  // Fallback to original circle rendering
  // Choose color based on direction
  const colors = p.isAI ? aiDirectionColors : directionColors;
  const pulseSize = p.size + Math.sin(p.pulse) * 2;
  
  // Draw the player (ball)
  ctx.beginPath();
  ctx.arc(p.x, p.y, pulseSize, 0, Math.PI * 2);
  ctx.fillStyle = colors[p.direction];
  ctx.fill();
  ctx.strokeStyle = p.isAI ? '#333333' : '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Player label and direction arrow removed per request
};

// Helper function to draw player death animation
export const drawPlayerDeath = (
  ctx: CanvasRenderingContext2D,
  player: Player,
  killerAI: Player | null,
  progress: number
) => {
  ctx.save();

  // Attempt to use the loaded character sprite sheet for death frames (4th column, 6 rows)
  // Fallback to simple circle fade if sprite not ready
  const sprite = characterSprite; // reuse existing loaded character sprite
  const deathFrameCount = 6; // 6 rows in the 4th column

  if (sprite && sprite.getImage) {
    const img: HTMLImageElement | null = sprite.getImage();
    const cfg = sprite.getConfig?.();
    if (img && cfg) {
      const frameWidth = cfg.frameWidth;
      const frameHeight = cfg.frameHeight;
      const columnIndex = 3; // 4th column (0-indexed)
      // Determine frame based on progress
      const rawFrame = Math.min(deathFrameCount - 1, Math.floor(progress * deathFrameCount));
      const sx = frameWidth * columnIndex;
      const sy = frameHeight * rawFrame; // Each death frame is a row
      const destSize = player.size * 2.5;
      const destX = player.x - destSize / 2;
      const destY = player.y - destSize / 2;

      // Draw underlying faint red expansion
      const ringOpacity = 0.4 * (1 - progress);
      ctx.beginPath();
      ctx.arc(player.x, player.y, destSize * 0.8 + progress * destSize * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,0,0,${ringOpacity})`;
      ctx.fill();

      ctx.drawImage(img, sx, sy, frameWidth, frameHeight, destX, destY, destSize, destSize);

      // Fade out towards end
      if (progress > 0.7) {
        ctx.globalAlpha = (progress - 0.7) / 0.3; // 0 to 1 last 30%
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,0,0,0.85)';
        ctx.fillText('DEAD', player.x, player.y + destSize * 0.6);
        ctx.globalAlpha = 1;
      }

      // Killer link early in animation
      if (killerAI && progress < 0.5) {
        ctx.strokeStyle = `rgba(255,0,0,${1 - progress * 2})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(killerAI.x, killerAI.y);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }
  }

  // Fallback simple effect if sprite not available
  const deathSize = player.size * (1 + progress * 0.5);
  const opacity = Math.max(0, 1 - progress);
  ctx.beginPath();
  ctx.arc(player.x, player.y, deathSize * 2 * progress, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,0,0,${opacity * 0.5})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(player.x, player.y, deathSize, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200,200,200,${opacity})`;
  ctx.fill();
  ctx.restore();
};
