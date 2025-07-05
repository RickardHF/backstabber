import { Box } from './types';

// Spawn point coordinates based on the layout image
export interface SpawnPoint {
  x: number;
  y: number;
}

// Fixed layout configuration
export const MAP_CONFIG = {
  // Canvas dimensions
  width: 800,
  height: 600,
  
  // User spawn point (U in the image) - appears to be on the left side
  userSpawnPoint: { x: 150, y: 300 },
  
  // AI spawn points (X marks in the image)
  aiSpawnPoints: [
    { x: 650, y: 150 },  // Top right area
    { x: 650, y: 450 },  // Bottom right area  
    { x: 400, y: 100 },  // Top center area
    { x: 400, y: 500 },  // Bottom center area
  ]
};

// Generate the fixed wall layout based on the image
export const generateMapLayout = (canvasWidth: number = 800, canvasHeight: number = 600): Box[] => {
  const walls: Box[] = [];
  
  // Wall thickness
  const wallThickness = 20;
  
  // Outer boundary walls
  // Top wall
  walls.push({
    id: 'wall-top',
    x: canvasWidth / 2,
    y: wallThickness / 2,
    width: canvasWidth,
    height: wallThickness,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(canvasWidth, wallThickness) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Bottom wall
  walls.push({
    id: 'wall-bottom',
    x: canvasWidth / 2,
    y: canvasHeight - wallThickness / 2,
    width: canvasWidth,
    height: wallThickness,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(canvasWidth, wallThickness) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Left wall
  walls.push({
    id: 'wall-left',
    x: wallThickness / 2,
    y: canvasHeight / 2,
    width: wallThickness,
    height: canvasHeight,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(wallThickness, canvasHeight) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Right wall
  walls.push({
    id: 'wall-right',
    x: canvasWidth - wallThickness / 2,
    y: canvasHeight / 2,
    width: wallThickness,
    height: canvasHeight,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(wallThickness, canvasHeight) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Inner walls creating the layout from the image
  
  // Top horizontal wall (creating top corridor)
  walls.push({
    id: 'wall-inner-top',
    x: canvasWidth / 2,
    y: canvasHeight * 0.25,
    width: canvasWidth * 0.6, // Leaves gaps on sides
    height: wallThickness,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(canvasWidth * 0.6, wallThickness) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Bottom horizontal wall (creating bottom corridor)
  walls.push({
    id: 'wall-inner-bottom',
    x: canvasWidth / 2,
    y: canvasHeight * 0.75,
    width: canvasWidth * 0.6, // Leaves gaps on sides
    height: wallThickness,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(canvasWidth * 0.6, wallThickness) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Left vertical wall section
  walls.push({
    id: 'wall-inner-left',
    x: canvasWidth * 0.3,
    y: canvasHeight / 2,
    width: wallThickness,
    height: canvasHeight * 0.3, // Shorter to create passages
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(wallThickness, canvasHeight * 0.3) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Right vertical wall section
  walls.push({
    id: 'wall-inner-right',
    x: canvasWidth * 0.7,
    y: canvasHeight / 2,
    width: wallThickness,
    height: canvasHeight * 0.3, // Shorter to create passages
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(wallThickness, canvasHeight * 0.3) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  return walls;
};

// Get a random AI spawn point
export const getRandomAISpawnPoint = (): SpawnPoint => {
  const spawnPoints = MAP_CONFIG.aiSpawnPoints;
  return spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
};

// Get the user spawn point
export const getUserSpawnPoint = (): SpawnPoint => {
  return MAP_CONFIG.userSpawnPoint;
};

// Check if a position is valid for spawning (not inside walls)
export const isValidSpawnPosition = (x: number, y: number, size: number, walls: Box[]): boolean => {
  const buffer = 10; // Additional buffer around walls
  
  for (const wall of walls) {
    const playerLeft = x - size - buffer;
    const playerRight = x + size + buffer;
    const playerTop = y - size - buffer;
    const playerBottom = y + size + buffer;
    
    const wallLeft = wall.x - wall.width / 2;
    const wallRight = wall.x + wall.width / 2;
    const wallTop = wall.y - wall.height / 2;
    const wallBottom = wall.y + wall.height / 2;
    
    // Check if player would overlap with wall
    if (playerLeft < wallRight && playerRight > wallLeft && 
        playerTop < wallBottom && playerBottom > wallTop) {
      return false;
    }
  }
  
  return true;
};
