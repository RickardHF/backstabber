// Game types and interfaces
export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

// Base interface for all game entities
export interface GameObject {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  size: number;
  pulse: number;
  // New properties for rotation-based movement
  rotation: number; // Rotation in radians
  rotationSpeed: number; // Rotation speed in radians
}

// Player interface
export interface Player extends GameObject {
  isAI?: boolean;
  isDead?: boolean;
}

// AI vision state interface
export interface AIVision {
  canSeePlayer: boolean;
  visionConeAngle: number;
  visionDistance: number;
}

// AI Manager configuration interface
export interface AIManagerConfig {
  maxBots: number;
  spawnLocation: { x: number, y: number };
  minSpawnDelay: number;
  maxSpawnDelay: number;
  enabled: boolean;
}

// Box interface for obstacles
export interface Box extends GameObject {
  width: number;
  height: number;
  color: string;
}

// Generic collision object interface for collision detection system
export interface CollisionObject {
  id: string;
  x: number;
  y: number;
  getBounds: () => { left: number; right: number; top: number; bottom: number };
}
