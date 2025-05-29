import { Player, Direction, Box } from './types';
import { calculateNonCollidingPosition } from './collision';

// Update player position based on key presses
export const updatePlayer = (
  player: Player,
  keysPressed: { [key: string]: boolean },
  canvas: HTMLCanvasElement | null,
  boxes: Box[] = [],
  aiPlayer: Player | undefined = undefined
): Player => {
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
  const finalPosition = calculateNonCollidingPosition(newX, newY, player, boxes, aiPlayer);
  
  return {
    ...player,
    x: finalPosition.x,
    y: finalPosition.y,
    direction: newDirection,
    rotation: newRotation,
    pulse: (player.pulse + 0.1) % (Math.PI * 2) // Increment pulse for animation
  };
};
