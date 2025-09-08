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

// Update player position based on key presses or joystick input
export const updatePlayer = (
  player: Player,
  keysPressed: { [key: string]: boolean },
  canvas: HTMLCanvasElement | null,
  boxes: Box[] = [],
  joystickInput: { x: number; y: number } | null | undefined = undefined,
  deltaTimeSeconds: number = 1 / 60, // default to ~16ms frame if not provided
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
  const rotationSpeed = player.rotationSpeed || 0.05; // radians per second
  const rotationDelta = rotationSpeed * deltaTimeSeconds; // frame scaled rotation
  const moveDeltaBase = player.speed * deltaTimeSeconds; // frame scaled movement (pixels this frame)
  let attemptedMove = false; // track whether any translational movement was requested this frame

  // Handle joystick input if provided
  if (joystickInput && (Math.abs(joystickInput.x) > 0.1 || Math.abs(joystickInput.y) > 0.1)) {
    // Calculate target rotation based on joystick input
    const targetRotation = Math.atan2(joystickInput.y, joystickInput.x);
    
    // Smoothly rotate towards the target
    let rotationDiff = targetRotation - newRotation;
    
    // Normalize the rotation difference to [-π, π]
    while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
    while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
    
    // Apply rotation with a smoothing factor
    const rotationSmoothingFactor = 0.2;
  newRotation += rotationDiff * rotationSmoothingFactor; // already scaled smoothing
    
    // Normalize rotation to [0, 2π]
    if (newRotation < 0) newRotation += Math.PI * 2;
    if (newRotation >= Math.PI * 2) newRotation -= Math.PI * 2;
    
    // Move in the direction of the joystick
    const moveSpeed = Math.sqrt(joystickInput.x * joystickInput.x + joystickInput.y * joystickInput.y);
    if (moveSpeed > 0.05) { // deadzone check (slightly smaller than initial threshold)
      newX += Math.cos(targetRotation) * moveDeltaBase * moveSpeed;
      newY += Math.sin(targetRotation) * moveDeltaBase * moveSpeed;
      attemptedMove = true;
    }
    
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

  // Handle keyboard input (only if no joystick input)
  if (!joystickInput || (Math.abs(joystickInput.x) <= 0.1 && Math.abs(joystickInput.y) <= 0.1)) {
    // Rotate left with 'a' key
    if (keysPressed['a']) {
  newRotation -= rotationDelta;
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
  newRotation += rotationDelta;
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
      newX += Math.cos(newRotation) * moveDeltaBase;
      newY += Math.sin(newRotation) * moveDeltaBase;
      attemptedMove = true;
    }
    // Move backward with 's' key
    if (keysPressed['s']) {
      newX -= Math.cos(newRotation) * moveDeltaBase;
      newY -= Math.sin(newRotation) * moveDeltaBase;
      attemptedMove = true;
    }
  }

  // If we moved forward/backward without changing rotation (so direction still 'none'),
  // derive a cardinal direction from current rotation so walking animation triggers.
  if (attemptedMove && newDirection === 'none') {
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
  // Keep player within world (map) bounds (independent of viewport size)
  if (canvas) {
    // Use MAP_CONFIG from MapLayout for world size
    // (lazy import to avoid circular dependency at top level)
    const { MAP_CONFIG } = require('./MapLayout');
    const worldW = MAP_CONFIG.width;
    const worldH = MAP_CONFIG.height;
    newX = Math.max(player.size, Math.min(worldW - player.size, newX));
    newY = Math.max(player.size, Math.min(worldH - player.size, newY));
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
  }  // Check for collisions with each AI player
  let collidedWithAI = false;
  let collidingAI: Player | undefined;
  
  for (const aiPlayer of aiPlayers) {
    if (aiPlayer.isDead) continue; // Skip dead AI players
    
    // Calculate distance between player and AI
    const distance = Math.sqrt(
      Math.pow(player.x - aiPlayer.x, 2) + Math.pow(player.y - aiPlayer.y, 2)
    );
    
    // Consider collision if AI is very close to player (touching or nearly touching)
    const collisionThreshold = player.size + aiPlayer.size + 2; // Small buffer for near-touching
    const isColliding = distance < collisionThreshold;
    
    // Also check traditional collision detection for movement-based collisions
    const newPositionCollision = calculateNonCollidingPosition(finalX, finalY, player, [], aiPlayer);
    const hasMovementCollision = newPositionCollision.x !== finalX || newPositionCollision.y !== finalY;
    
    if (isColliding || hasMovementCollision) {
      // We hit an AI player (either by proximity or movement)
      collidedWithAI = true;
      collidingAI = aiPlayer;
      
      // If collision is from movement, use the adjusted position
      if (hasMovementCollision) {
        finalX = newPositionCollision.x;
        finalY = newPositionCollision.y;
      }
      break;
    }
  }
  
  // If no move input actually applied, mark direction as none so idle animation shows
  if (!attemptedMove) {
    newDirection = 'none';
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
