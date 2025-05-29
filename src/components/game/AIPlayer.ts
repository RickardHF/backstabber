import { Player, AIVision, Box } from './types';
import { calculateNonCollidingPosition } from './collision';

// Check if a line intersects with a box
const lineIntersectsBox = (
  x1: number, y1: number,
  x2: number, y2: number,
  box: Box
): boolean => {
  // Box bounds
  const left = box.x - box.width / 2;
  const right = box.x + box.width / 2;
  const top = box.y - box.height / 2;
  const bottom = box.y + box.height / 2;
  
  // Function to check if a line segment intersects with a horizontal or vertical line
  const intersects = (
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    x4: number, y4: number
  ): boolean => {
    // Calculate the denominator
    const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    
    // If den is 0, lines are parallel
    if (den === 0) return false;
    
    // Calculate ua and ub parameters
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;
    
    // Return true if the intersection point is on both line segments
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  };
  
  // Check if the line intersects with any of the box sides
  return (
    // Top edge
    intersects(x1, y1, x2, y2, left, top, right, top) ||
    // Right edge
    intersects(x1, y1, x2, y2, right, top, right, bottom) ||
    // Bottom edge
    intersects(x1, y1, x2, y2, left, bottom, right, bottom) ||
    // Left edge
    intersects(x1, y1, x2, y2, left, top, left, bottom)
  );
};

// Check if player is within AI's vision cone and no obstacles block the view
export const checkAiVision = (
  aiPlayer: Player,
  player: Player,
  aiVision: AIVision,
  boxes: Box[] = [],
  otherPlayer?: Player // Can optionally check if another player blocks the view
): AIVision => {
  // Calculate vector from AI to player
  const dx = player.x - aiPlayer.x;
  const dy = player.y - aiPlayer.y;
  
  // Calculate distance between AI and player
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // If player is too far, AI can't see it
  if (distance > aiVision.visionDistance) {
    return { ...aiVision, canSeePlayer: false };
  }
  
  // Use the rotation property for vision cone direction
  const rotation = aiPlayer.rotation || 0;
  
  // Calculate the angle to the player in radians
  const angleToPlayer = Math.atan2(dy, dx);
  
  // Calculate the difference between the two angles
  let angleDiff = Math.abs(angleToPlayer - rotation);
  // Ensure the angle difference is between 0 and PI
  if (angleDiff > Math.PI) {
    angleDiff = 2 * Math.PI - angleDiff;
  }
  
  // Convert vision cone angle from degrees to radians for comparison
  const visionConeAngleRad = (aiVision.visionConeAngle * Math.PI) / 180;
  
  // Check if player is within the vision cone
  const isInCone = angleDiff <= visionConeAngleRad / 2;
  
  // If not in cone, definitely can't see
  if (!isInCone) {
    return { ...aiVision, canSeePlayer: false };
  }
  
  // Check if line of sight is blocked by any boxes
  for (const box of boxes) {
    if (lineIntersectsBox(aiPlayer.x, aiPlayer.y, player.x, player.y, box)) {
      return { ...aiVision, canSeePlayer: false };
    }
  }
  
  // Check if line of sight is blocked by another player (if provided)
  if (otherPlayer && otherPlayer.id !== player.id && otherPlayer.id !== aiPlayer.id) {
    // Approximate the other player as a square for intersection test
    const playerBox: Box = {
      ...otherPlayer,
      width: otherPlayer.size * 2,
      height: otherPlayer.size * 2,
      color: 'unused'
    };
    
    if (lineIntersectsBox(aiPlayer.x, aiPlayer.y, player.x, player.y, playerBox)) {
      return { ...aiVision, canSeePlayer: false };
    }
  }
  
  // No obstacles in the way, player is visible
  return { ...aiVision, canSeePlayer: isInCone };
};

// Update AI player position based on its current direction and vision
export const updateAiPlayer = (
  aiPlayer: Player,
  player: Player,
  aiVision: AIVision,
  canvas: HTMLCanvasElement | null,
  boxes: Box[] = [],
  otherAIPlayers: Player[] = []
): { updatedAiPlayer: Player, updatedAiVision: AIVision } => {
  // First, check if AI can see the player, passing in the boxes to check for line-of-sight
  const updatedAiVision = checkAiVision(aiPlayer, player, aiVision, boxes, otherAIPlayers.length > 0 ? otherAIPlayers[0] : undefined);
  
  let newX = aiPlayer.x;
  let newY = aiPlayer.y;
  let newDirection = aiPlayer.direction;
  let newRotation = aiPlayer.rotation || 0;
  const rotationSpeed = aiPlayer.rotationSpeed || 0.05;
  
  if (updatedAiVision.canSeePlayer) {
    // If AI can see player, calculate the angle to the player
    const dx = player.x - aiPlayer.x;
    const dy = player.y - aiPlayer.y;
    
    // Calculate distance to player
    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate angle to player
    const angleToPlayer = Math.atan2(dy, dx);
    
    // If AI is close enough to the player, stop moving but keep facing the player
    if (distanceToPlayer < aiPlayer.size + player.size) {
      // Stop moving but track the player by rotating towards them
      newRotation = angleToPlayer;
      
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
      
      // Return early with updated rotation but same position
      return {
        updatedAiPlayer: {
          ...aiPlayer,
          direction: newDirection,
          rotation: newRotation,
          pulse: (aiPlayer.pulse + 0.08) % (Math.PI * 2)
        },
        updatedAiVision
      };
    }
    
    // Calculate rotation difference
    let rotationDiff = angleToPlayer - newRotation;
    if (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
    if (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
    
    // Gradually rotate towards the player
    if (Math.abs(rotationDiff) > 0.1) {
      if (rotationDiff > 0) {
        newRotation += rotationSpeed;
      } else {
        newRotation -= rotationSpeed;
      }
    } else {
      newRotation = angleToPlayer; // Snap to exact angle when close
    }
    
    // Normalize rotation to 0-2π range
    if (newRotation < 0) newRotation += Math.PI * 2;
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
    
    // Move forward in the direction we're facing
    newX += Math.cos(newRotation) * aiPlayer.speed;
    newY += Math.sin(newRotation) * aiPlayer.speed;
  } else {
    // If AI can't see player, keep moving in current direction
    // and occasionally make random rotations in the AI movement interval
    newX += Math.cos(newRotation) * aiPlayer.speed;
    newY += Math.sin(newRotation) * aiPlayer.speed;
  }
    // Keep AI player within canvas bounds and change rotation if hitting a wall
  if (canvas) {
    // Check if AI player would go out of bounds
    const wouldHitWall = 
      newX < aiPlayer.size || 
      newX > canvas.width - aiPlayer.size ||
      newY < aiPlayer.size || 
      newY > canvas.height - aiPlayer.size;
    
    // Change rotation if hitting a wall
    if (wouldHitWall) {
      // Rotate 180 degrees to move away from wall
      newRotation += Math.PI;
      if (newRotation >= Math.PI * 2) newRotation -= Math.PI * 2;
      
      // Update direction based on new rotation angle
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
    
    // Ensure the AI stays within bounds regardless
    newX = Math.max(aiPlayer.size, Math.min(canvas.width - aiPlayer.size, newX));
    newY = Math.max(aiPlayer.size, Math.min(canvas.height - aiPlayer.size, newY));
  }
    // Check for and handle collisions with all entities
  const collidableEntities = [player, ...boxes];
  
  // Add other AI players to collision check
  if (otherAIPlayers && otherAIPlayers.length > 0) {
    collidableEntities.push(...otherAIPlayers);
  }
  
  // Calculate non-colliding position
  const { x: finalX, y: finalY } = calculateNonCollidingPosition(
    newX, 
    newY, 
    aiPlayer, 
    boxes, 
    player,
    otherAIPlayers
  );
  
  // If the AI hits a box or player, choose a new random rotation
  if (finalX !== newX || finalY !== newY) {
    // Add a random angle change between 90° and 270° (π/2 and 3π/2)
    newRotation += Math.PI / 2 + Math.random() * Math.PI;
    if (newRotation >= Math.PI * 2) newRotation -= Math.PI * 2;
    
    // Update direction based on new rotation angle
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
  
  return {
    updatedAiPlayer: {
      ...aiPlayer,
      x: finalX,
      y: finalY,
      direction: newDirection,
      rotation: newRotation,
      pulse: (aiPlayer.pulse + 0.08) % (Math.PI * 2)
    },
    updatedAiVision
  };
};
