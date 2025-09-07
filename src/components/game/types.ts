// Game types and interfaces
export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

// Base interface for all game entities
export interface GameObject {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  /**
   * Movement speed in pixels per second (frame-rate independent)
   */
  speed: number;
  size: number;
  pulse: number;
  // Rotation-based movement
  rotation: number; // Rotation in radians
  /**
   * Rotation speed in radians per second (frame-rate independent)
   */
  rotationSpeed: number;
}

// Player interface
export interface Player extends GameObject {
  isAI?: boolean;
  isDead?: boolean;
  isAttacking?: boolean;
  vision?: { 
    visionConeAngle: number;  // Field of view angle in degrees
    visionDistance: number;   // How far the player can see
  };
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
