import { Player, AIVision, AIManagerConfig, Box } from './types';
import { updateAiPlayer } from './AIPlayer';
import { checkPlayerBoxCollision, checkPlayerCollision } from './collision';
import { getRandomAISpawnPoint, isValidSpawnPosition as checkMapSpawnPosition, MAP_CONFIG } from './MapLayout';

/**
 * Manages multiple AI players, handling spawning, updating, and despawning
 */
export class AIManager {
  private aiPlayers: Player[] = [];
  private aiVisions: AIVision[] = [];
  private config: AIManagerConfig;
  private nextSpawnTime: number = 0;
  private lastUpdateTime: number | null = null;
  // Track death animation timing per AI id
  private deadAIStartTimes: Record<string, number> = {};
  private deathAnimationDurationMs: number = 500; // enemy death anim length
  
  constructor(config: AIManagerConfig) {
    this.config = config;
    // Set initial spawn time
    this.scheduleNextSpawn();
  }
    /**
   * Updates all AI players
   */
  updateAllAIPlayers(
    player: Player, 
    canvas: HTMLCanvasElement | null, 
    boxes: Box[], 
    currentTime: number
  ): void {
    // Calculate delta time (in seconds) since last update
    let deltaTimeSeconds = 1 / 60; // fallback
    if (this.lastUpdateTime !== null) {
      deltaTimeSeconds = (currentTime - this.lastUpdateTime) / 1000;
      // Clamp to avoid huge jumps when tab was inactive
      if (deltaTimeSeconds > 0.25) deltaTimeSeconds = 0.25; // max 250ms
    }
    this.lastUpdateTime = currentTime;
    // Check if we need to spawn a new AI player
  const effectiveMax = MAP_CONFIG.maxBots ?? this.config.maxBots;
  if (this.config.enabled && 
    this.aiPlayers.length < effectiveMax && 
        currentTime >= this.nextSpawnTime) {
      console.log("Spawning AI player at time:", currentTime);
      this.spawnAIPlayer(player, boxes);
      this.scheduleNextSpawn();
    }
    
    // Update each AI player
    const now = performance.now();
    for (let i = 0; i < this.aiPlayers.length; i++) {
      const aiPlayer = this.aiPlayers[i];
      if (aiPlayer.isDead) {
        // Progress death animation
        const start = this.deadAIStartTimes[aiPlayer.id];
        if (start) {
          const progress = Math.min(1, (now - start) / this.deathAnimationDurationMs);
          this.aiPlayers[i] = { ...aiPlayer, deathAnimationProgress: progress };
        }
        continue; // skip movement
      }
      const { updatedAiPlayer, updatedAiVision } = updateAiPlayer(
        aiPlayer,
        player,
        this.aiVisions[i],
        canvas,
        boxes,
        this.aiPlayers.filter(p => p.id !== aiPlayer.id && !p.isDead),
        deltaTimeSeconds
      );
      this.aiPlayers[i] = updatedAiPlayer;
      this.aiVisions[i] = updatedAiVision;
    }
    // Remove fully finished death animations (after freeze frame delay)
    this.removeDeadAIPlayers();
  }
    /**
   * Spawns a new AI player at a collision-free location
   */
  private spawnAIPlayer(humanPlayer: Player, boxes: Box[]
  ): void {
    // Don't spawn if we're at max capacity
  const effectiveMax = MAP_CONFIG.maxBots ?? this.config.maxBots;
  if (this.aiPlayers.length >= effectiveMax) return;
    
    // Get a random spawn point from the map layout
    const spawnPoint = getRandomAISpawnPoint();
    
    // Create a new AI player with spawn point location
    const newAIPlayer: Player = {
      id: `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  x: spawnPoint.x,
  y: spawnPoint.y,
      direction: 'right',
  // Was 0.5px per frame at 60fps => 30 px/s
  speed: 30, // Slower than human player
      size: 20,
      pulse: Math.PI * Math.random(), // Random starting phase
      isAI: true,
      isDead: false,
      rotation: Math.random() * Math.PI * 2, // Random starting rotation
  // Was 0.08 rad per frame at 60fps => 4.8 rad/s
  rotationSpeed: 4.8 // Slightly slower rotation than the player
    };
    
    // Clamp to world bounds if map larger than viewport
  const worldW = MAP_CONFIG.width;
  const worldH = MAP_CONFIG.height;
    if (newAIPlayer.x < 0) newAIPlayer.x = 0;
    if (newAIPlayer.y < 0) newAIPlayer.y = 0;
    if (newAIPlayer.x > worldW) newAIPlayer.x = worldW;
    if (newAIPlayer.y > worldH) newAIPlayer.y = worldH;
    // Validate the spawn position is clear
    if (!checkMapSpawnPosition(newAIPlayer.x, newAIPlayer.y, newAIPlayer.size, boxes)) {
      console.warn("AI spawn point is blocked by walls, trying alternative positions");
      
      // Try a few alternative positions near the spawn point
      const maxAttempts = 10;
      let attempts = 0;
      let foundValidPosition = false;
      
      while (!foundValidPosition && attempts < maxAttempts) {
        const offsetX = (Math.random() - 0.5) * 100; // Random offset within 100 pixels
        const offsetY = (Math.random() - 0.5) * 100;
        
        let testX = spawnPoint.x + offsetX;
        let testY = spawnPoint.y + offsetY;
        if (testX < 0) testX = 0;
        if (testY < 0) testY = 0;
        if (testX > worldW) testX = worldW;
        if (testY > worldH) testY = worldH;
        
        if (checkMapSpawnPosition(testX, testY, newAIPlayer.size, boxes)) {
          newAIPlayer.x = testX;
          newAIPlayer.y = testY;
          foundValidPosition = true;
        }
        attempts++;
      }
      
      if (!foundValidPosition) {
        console.warn("Could not find a valid spawn position for AI player");
        // As a last resort, scan random points across map
        for (let i = 0; i < 50 && !foundValidPosition; i++) {
            const rx = Math.random() * worldW;
            const ry = Math.random() * worldH;
          if (checkMapSpawnPosition(rx, ry, newAIPlayer.size, boxes)) {
            newAIPlayer.x = rx; newAIPlayer.y = ry; foundValidPosition = true; break;
          }
        }
        if (!foundValidPosition) return; // abort
      }    }
    
    // Check final position against human player and other AI
    if (!this.isValidSpawnPosition(newAIPlayer, humanPlayer, boxes)) {
      console.warn("Could not find a collision-free spawn position for AI player");
      return; // Don't spawn if position conflicts with players
    }
    
    // Create AI vision
    const newAIVision: AIVision = {
      canSeePlayer: false,
      visionConeAngle: 220, // 220 degrees vision cone
      visionDistance: 40 * 4 // 4x the body size
    };
    
    // Add to arrays
    this.aiPlayers.push(newAIPlayer);
    this.aiVisions.push(newAIVision);
  }
  
  /**
   * Checks if a spawn position is valid (no collisions with boxes, player, or other AI)
   */
  private isValidSpawnPosition(aiPlayer: Player, humanPlayer: Player, boxes: Box[]): boolean {
    // Check if the AI would collide with any box
    const collidingBox = checkPlayerBoxCollision(aiPlayer, boxes);
    if (collidingBox) {
      return false;
    }
    
    // Check if the AI would collide with the human player
    if (checkPlayerCollision(aiPlayer, humanPlayer)) {
      return false;
    }
    
    // Check if the AI would collide with any existing AI player
    for (const existingAI of this.aiPlayers) {
      if (checkPlayerCollision(aiPlayer, existingAI)) {
        return false;
      }
    }
    
    // No collisions, position is valid
    return true;
  }
  
  /**
   * Schedules the next spawn time based on the configured delays
   */  private scheduleNextSpawn(): void {
    const delay = this.config.minSpawnDelay + 
                  Math.random() * (this.config.maxSpawnDelay - this.config.minSpawnDelay);
    this.nextSpawnTime = performance.now() + delay;
  }
  
  /**
   * Removes AI players that are marked as dead
   */
  private removeDeadAIPlayers(): void {
    const removalDelay = this.deathAnimationDurationMs + 2000; // keep corpse for a while
    const now = performance.now();
    for (let i = this.aiPlayers.length - 1; i >= 0; i--) {
      const p = this.aiPlayers[i];
      if (p.isDead) {
        const start = this.deadAIStartTimes[p.id];
        if (start && now - start > removalDelay) {
          this.aiPlayers.splice(i, 1);
          this.aiVisions.splice(i, 1);
          delete this.deadAIStartTimes[p.id];
        }
      }
    }
  }
  
  /**
   * Marks an AI player as dead
   */
  markAIDead(aiId: string): void {
    const index = this.aiPlayers.findIndex(ai => ai.id === aiId);
    if (index !== -1) {
  // Ignore if already dead
  if (this.aiPlayers[index].isDead) return;
  this.aiPlayers[index] = { ...this.aiPlayers[index], isDead: true, deathAnimationProgress: 0 };
  this.deadAIStartTimes[aiId] = performance.now();
    }
  }
  
  /**
   * Gets all active AI players
   */
  getAIPlayers(): Player[] {
  // Return all including dead (so renderer can animate corpses); caller can filter
  return this.aiPlayers;
  }
  
  /**
   * Gets AI vision for a specific AI player
   */
  getAIVision(aiId: string): AIVision | undefined {
    const index = this.aiPlayers.findIndex(ai => ai.id === aiId);
    return index !== -1 ? this.aiVisions[index] : undefined;
  }
  
  /**
   * Updates the AI manager configuration
   */
  updateConfig(config: Partial<AIManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Gets the current AI manager configuration
   */
  getConfig(): AIManagerConfig {
    return this.config;
  }
}
