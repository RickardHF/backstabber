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
  /**
   * Progress of death animation 0..1 (undefined if alive)
   */
  deathAnimationProgress?: number;
  vision?: { 
    visionConeAngle: number;  // Field of view angle in degrees
    visionDistance: number;   // How far the player can see
  };
  effects?: PlayerEffect[];
}

// Player effect interface for temporary buffs/debuffs
export interface PlayerEffect {
  type: 'speedBoost' | 'greenFlame';
  duration: number; // Remaining duration in seconds
  multiplier: number; // e.g., 1.2 for 20% increase
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

// Item interface for collectible items
export interface Item extends GameObject {
  type: 'speedPotion' | 'greenFlame';
  spriteIndex: number; // Index in the sprite sheet
}

// Generic collision object interface for collision detection system
export interface CollisionObject {
  id: string;
  x: number;
  y: number;
  getBounds: () => { left: number; right: number; top: number; bottom: number };
}
