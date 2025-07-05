import { Player, Box } from './types';
import { directionColors, aiDirectionColors } from './constants';
import { CharacterSprite, createCharacterSprite, createCharacterSpriteFromImage } from './sprites';

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
  
  // Vertical lines
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
};

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
let lastUpdateTime: number = 0;

// Initialize character sprite on first use
const initializeSprite = () => {
  if (!characterSprite) {
    // Try to use image file first, fallback to procedural generation
    characterSprite = createCharacterSpriteFromImage('/character-sprite.png', {
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
      animationSpeed: 8
    });
  }
};

// Helper function to draw player with sprite
export const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player, useSprites: boolean = true) => {
  if (useSprites) {
    // Initialize sprite system if needed
    initializeSprite();
    
    // Calculate delta time for animation
    const currentTime = Date.now();
    const deltaTime = currentTime - lastUpdateTime;
    lastUpdateTime = currentTime;
    
    // Use sprite rendering
    if (characterSprite) {
      characterSprite.render(ctx, p, deltaTime, p.isAI || false);
      
      // Draw direction indicator line if moving
      if (p.direction !== 'none') {
        ctx.beginPath();
        
        // Starting point is the center of the player
        const indicatorLength = p.size + 15;
        
        // Use rotation property to determine the direction of the indicator
        const rotation = p.rotation || 0;
        const endX = p.x + Math.cos(rotation) * indicatorLength;
        const endY = p.y + Math.sin(rotation) * indicatorLength;
        
        // Draw main line indicator
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(endX, endY);
        
        // Add arrowhead
        const arrowSize = 6;
        const angle = Math.atan2(endY - p.y, endX - p.x);
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle - Math.PI / 6),
          endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle + Math.PI / 6),
          endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        
        ctx.strokeStyle = p.isAI ? '#FF4444' : '#4444FF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
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
  
  // Add label to distinguish between players
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(p.isAI ? 'AI' : 'P1', p.x, p.y + 4);
  
  // Draw direction indicator using rotation property
  if (p.direction !== 'none') {
    ctx.beginPath();
    
    // Starting point is the center of the player
    const indicatorLength = p.size + 10;
    
    // Use rotation property to determine the direction of the indicator
    const rotation = p.rotation || 0;
    const endX = p.x + Math.cos(rotation) * indicatorLength;
    const endY = p.y + Math.sin(rotation) * indicatorLength;
    
    // Draw main line indicator
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(endX, endY);
    
    // Add arrowhead
    const arrowSize = 5;
    const angle = Math.atan2(endY - p.y, endX - p.x);
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle - Math.PI / 6),
      endY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowSize * Math.cos(angle + Math.PI / 6),
      endY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
      ctx.strokeStyle = p.isAI ? '#333333' : '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
};

// Helper function to draw player death animation
export const drawPlayerDeath = (
  ctx: CanvasRenderingContext2D, 
  player: Player, 
  killerAI: Player | null, 
  progress: number
) => {
  // Save current context
  ctx.save();
  
  // Use progress to create animation effects
  const deathSize = player.size * (1 + progress * 0.5); // Expand slightly as death progresses
  const opacity = Math.max(0, 1 - progress); // Fade out as progress increases
  
  // Draw expanding red circle (blood splatter effect)
  ctx.beginPath();
  ctx.arc(player.x, player.y, deathSize * 2 * progress, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 0, 0, ${opacity * 0.5})`;
  ctx.fill();
  
  // Draw the player fading out
  ctx.beginPath();
  ctx.arc(player.x, player.y, deathSize, 0, Math.PI * 2);
  
  // Get player color and fade it out
  const colors = directionColors;
  const baseColor = colors[player.direction];
  
  // Parse the RGB values from the color string
  const rgbMatch = baseColor.match(/\d+/g);
  if (rgbMatch && rgbMatch.length >= 3) {
    const [r, g, b] = rgbMatch.map(Number);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } else {
    // Fallback if color parsing fails
    ctx.fillStyle = `rgba(100, 100, 100, ${opacity})`;
  }
  
  ctx.fill();
  
  // Draw the border
  ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // If close to completion of animation, add text
  if (progress > 0.5) {
    const textOpacity = (progress - 0.5) * 2; // Fade in text during second half
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255, 0, 0, ${textOpacity})`;
    ctx.fillText('DEAD', player.x, player.y);
  }
  
  // Draw a line connecting the player to the killer AI if available
  if (killerAI && progress < 0.8) {
    const lineOpacity = 1 - progress / 0.8;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(killerAI.x, killerAI.y);
    ctx.strokeStyle = `rgba(255, 0, 0, ${lineOpacity})`;
    ctx.lineWidth = 2 * (1 - progress);
    ctx.stroke();
  }
  
  // Restore context
  ctx.restore();
};
