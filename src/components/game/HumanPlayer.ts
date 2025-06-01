import { Player, Direction, Box, AIVision } from './types';
import { calculateNonCollidingPosition } from './collision';

// Function to check if player is behind an AI bot (outside of vision cone)
export const isPlayerBehindAI = (
  player: Player,
  aiPlayer: Player,
  aiVision: AIVision
): boolean => {
  // Calculate vector from AI to player
  const dx = player.x - aiPlayer.x;
  const dy = player.y - aiPlayer.y;
  
  // Calculate distance between AI and player
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Player must be close enough to the AI to backstab
  const backstabDistance = aiPlayer.size * 2.5;
  if (distance > backstabDistance) {
    return false;
  }
  
  // Calculate the angle to the player in radians
  const angleToPlayer = Math.atan2(dy, dx);
  
  // Get the AI's rotation
  const rotation = aiPlayer.rotation || 0;
  
  // Calculate the difference between the two angles
  let angleDiff = Math.abs(angleToPlayer - rotation);
  // Ensure the angle difference is between 0 and PI
  if (angleDiff > Math.PI) {
    angleDiff = 2 * Math.PI - angleDiff;
  }
  
  // Convert vision cone angle from degrees to radians for comparison
  const visionConeAngleRad = (aiVision.visionConeAngle * Math.PI) / 180;
  
  // Check if player is outside the vision cone
  const isOutsideCone = angleDiff > visionConeAngleRad / 2;
  
  return isOutsideCone;
};

// Interface for player update result, including information about enemy collisions
export interface PlayerUpdateResult {
  updatedPlayer: Player;
  collidedWithAI: boolean;
  collidingAI?: Player;
}

// Update player position based on key presses
export const updatePlayer = (
  player: Player,
  keysPressed: { [key: string]: boolean },
  canvas: HTMLCanvasElement | null,
  boxes: Box[] = [],
  ...aiPlayers: Player[]
): PlayerUpdateResult => {
  // If player is already dead, don't process movement
  if (player.isDead) {
    return {
      updatedPlayer: player,
      collidedWithAI: false
    };
  }
  
  let newX = player.x;
  let newY = player.y;
  let newDirection: Direction = player.direction;
  let newRotation = player.rotation || 0;
  const rotationSpeed = player.rotationSpeed || 0.05; // Default rotation speed if not set

  // Rotate left with 'a' key
  if (keysPressed['a']) {
    newRotation -= rotationSpeed;
    if (newRotation < 0) newRotation += Math.PI * 2;
    
    // Update direction based on rotation angle
    if (newRotation >= 7 * Math.PI / 4 || newRotation < Math.PI / 4) {
      newDirection = 'right';
    } else if (newRotation >= Math.PI / 4 && newRotation < 3 * Math.PI / 4) {
      newDirection = 'down';
    } else if (newRotation >= 3 * Math.PI / 4 && newRotation < 5 * Math.PI / 4) {
      newDirection = 'left';
    } else {
      newDirection = 'up';
    }
  }
  
  // Rotate right with 'd' key
  if (keysPressed['d']) {
    newRotation += rotationSpeed;
    if (newRotation >= Math.PI * 2) newRotation -= Math.PI * 2;
    
    // Update direction based on rotation angle
    if (newRotation >= 7 * Math.PI / 4 || newRotation < Math.PI / 4) {
      newDirection = 'right';
    } else if (newRotation >= Math.PI / 4 && newRotation < 3 * Math.PI / 4) {
      newDirection = 'down';
    } else if (newRotation >= 3 * Math.PI / 4 && newRotation < 5 * Math.PI / 4) {
      newDirection = 'left';
    } else {
      newDirection = 'up';
    }
  }
  
  // Move forward with 'w' key
  if (keysPressed['w']) {
    newX += Math.cos(newRotation) * player.speed;
    newY += Math.sin(newRotation) * player.speed;
  }
  
  // Move backward with 's' key
  if (keysPressed['s']) {
    newX -= Math.cos(newRotation) * player.speed;
    newY -= Math.sin(newRotation) * player.speed;
  }
  // Keep player within canvas bounds
  if (canvas) {
    newX = Math.max(player.size, Math.min(canvas.width - player.size, newX));
    newY = Math.max(player.size, Math.min(canvas.height - player.size, newY));
  }
    // Check for collisions and adjust position if necessary
  
  // Start with the assumption that the position is valid
  let finalX = newX;
  let finalY = newY;
  
  // Check for box collisions first
  const boxCollisionResult = calculateNonCollidingPosition(newX, newY, player, boxes);
  if (boxCollisionResult.x !== newX || boxCollisionResult.y !== newY) {
    // We hit a box, use the adjusted position
    finalX = boxCollisionResult.x;
    finalY = boxCollisionResult.y;
  }
    // Check for collisions with each AI player
  let collidedWithAI = false;
  let collidingAI: Player | undefined;
  
  for (const aiPlayer of aiPlayers) {
    if (aiPlayer.isDead) continue; // Skip dead AI players
    
    const aiCollisionResult = calculateNonCollidingPosition(finalX, finalY, player, [], aiPlayer);
    if (aiCollisionResult.x !== finalX || aiCollisionResult.y !== finalY) {
      // We hit an AI player
      collidedWithAI = true;
      collidingAI = aiPlayer;
      
      // Still use the adjusted position until game processes the collision
      finalX = aiCollisionResult.x;
      finalY = aiCollisionResult.y;
      break;
    }
  }
  
  const updatedPlayer = {
    ...player,
    x: finalX,
    y: finalY,
    direction: newDirection,
    rotation: newRotation,
    pulse: (player.pulse + 0.1) % (Math.PI * 2) // Increment pulse for animation
  };
  
  return {
    updatedPlayer,
    collidedWithAI,
    collidingAI
  };
};
