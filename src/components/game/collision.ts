import { CollisionObject, Player, Box } from './types';

// General collision detection function that checks if two objects collide
export const checkCollision = (obj1: CollisionObject, obj2: CollisionObject): boolean => {
  const bounds1 = obj1.getBounds();
  const bounds2 = obj2.getBounds();

  return (
    bounds1.left < bounds2.right &&
    bounds1.right > bounds2.left &&
    bounds1.top < bounds2.bottom &&
    bounds1.bottom > bounds2.top
  );
};

// Function to check if a player collides with any box in an array of boxes
export const checkPlayerBoxCollision = (
  player: Player,
  boxes: Box[]
): Box | null => {
  // Create a collision object from the player
  const playerCollision: CollisionObject = {
    id: player.id,
    x: player.x,
    y: player.y,
    getBounds: () => ({
      left: player.x - player.size,
      right: player.x + player.size,
      top: player.y - player.size,
      bottom: player.y + player.size
    })
  };

  // Check collision with each box
  for (const box of boxes) {
    const boxCollision: CollisionObject = {
      id: box.id,
      x: box.x,
      y: box.y,
      getBounds: () => ({
        left: box.x - box.width / 2,
        right: box.x + box.width / 2,
        top: box.y - box.height / 2,
        bottom: box.y + box.height / 2
      })
    };

    if (checkCollision(playerCollision, boxCollision)) {
      return box;
    }
  }

  return null;
};

// Check if players are colliding with each other
export const checkPlayerCollision = (player1: Player, player2: Player): boolean => {
  // Combine radiuses (sizes) of both players
  const minDistance = player1.size + player2.size;
  
  // Calculate distance between players using distance formula
  const distance = Math.sqrt(
    Math.pow(player1.x - player2.x, 2) + 
    Math.pow(player1.y - player2.y, 2)
  );
  
  // If distance is less than the combined sizes, they're colliding
  return distance < minDistance;
};

// Function to prevent movement into colliding objects with wall sliding
export const calculateNonCollidingPosition = (
  newX: number, 
  newY: number, 
  player: Player, 
  boxes: Box[],
  otherPlayer?: Player,
  otherAIPlayers: Player[] = []
): { x: number, y: number } => {
  // Create test player at the new position
  const testPlayer: Player = {
    ...player,
    x: newX,
    y: newY
  };

  // Check for box collisions with wall sliding
  const collidingBox = checkPlayerBoxCollision(testPlayer, boxes);
  if (collidingBox) {
    return calculateWallSlidePosition(player.x, player.y, newX, newY, player, boxes);
  }

  // Check for player collision if another player exists
  if (otherPlayer && checkPlayerCollision(testPlayer, otherPlayer)) {
    // For player collisions, still use the old behavior (no sliding)
    return {
      x: player.x,
      y: player.y
    };
  }
  
  // Check for collisions with other AI players
  if (otherAIPlayers && otherAIPlayers.length > 0) {
    for (const aiPlayer of otherAIPlayers) {
      // Skip if this is comparing with itself or a dead AI
      if (aiPlayer.id === player.id || aiPlayer.isDead) continue;
      
      if (checkPlayerCollision(testPlayer, aiPlayer)) {
        // For AI player collisions, still use the old behavior (no sliding)
        return {
          x: player.x,
          y: player.y
        };
      }
    }
  }

  // No collision, return the new position
  return {
    x: newX,
    y: newY
  };
};

// Function to calculate wall sliding position
export const calculateWallSlidePosition = (
  currentX: number,
  currentY: number,
  targetX: number,
  targetY: number,
  player: Player,
  boxes: Box[]
): { x: number, y: number } => {
  // Try horizontal movement only
  const testPlayerX: Player = {
    ...player,
    x: targetX,
    y: currentY
  };
  
  // Try vertical movement only
  const testPlayerY: Player = {
    ...player,
    x: currentX,
    y: targetY
  };
  
  const hasHorizontalCollision = checkPlayerBoxCollision(testPlayerX, boxes) !== null;
  const hasVerticalCollision = checkPlayerBoxCollision(testPlayerY, boxes) !== null;
  
  // If neither horizontal nor vertical movement alone would cause collision,
  // there might be a corner collision, so allow the movement that's safer
  if (!hasHorizontalCollision && !hasVerticalCollision) {
    // Both movements are safe individually, so the original target is safe
    return { x: targetX, y: targetY };
  }
  
  // If only horizontal movement causes collision, allow vertical sliding
  if (hasHorizontalCollision && !hasVerticalCollision) {
    return { x: currentX, y: targetY };
  }
  
  // If only vertical movement causes collision, allow horizontal sliding
  if (!hasHorizontalCollision && hasVerticalCollision) {
    return { x: targetX, y: currentY };
  }
  
  // Both movements cause collision, stay in place
  return { x: currentX, y: currentY };
};
