import { Player, AIVision, AIManagerConfig, Box } from './types';
import { updateAiPlayer } from './AIPlayer';
import { checkPlayerBoxCollision, checkPlayerCollision } from './collision';
import { getRandomAISpawnPoint, isValidSpawnPosition as checkMapSpawnPosition } from './MapLayout';

/**
 * Manages multiple AI players, handling spawning, updating, and despawning
 */
export class AIManager {
  private aiPlayers: Player[] = [];
  private aiVisions: AIVision[] = [];
  private config: AIManagerConfig;
  private nextSpawnTime: number = 0;
  private lastUpdateTime: number | null = null;
  
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
    if (this.config.enabled && 
        this.aiPlayers.length < this.config.maxBots && 
        currentTime >= this.nextSpawnTime) {
      console.log("Spawning AI player at time:", currentTime);
      this.spawnAIPlayer(player, boxes);
      this.scheduleNextSpawn();
    }
    
    // Update each AI player
    for (let i = 0; i < this.aiPlayers.length; i++) {
      const aiPlayer = this.aiPlayers[i];
      
      // Skip if AI player is marked as dead
      if (aiPlayer.isDead) continue;
      
      // Update this AI player
      const { updatedAiPlayer, updatedAiVision } = updateAiPlayer(
        aiPlayer,
        player,
        this.aiVisions[i],
        canvas,
        boxes,
        // Pass other AI players as obstacles for collision detection
        this.aiPlayers.filter(p => p.id !== aiPlayer.id && !p.isDead),
        deltaTimeSeconds
      );
      
      // Update the AI player and vision
      this.aiPlayers[i] = updatedAiPlayer;
      this.aiVisions[i] = updatedAiVision;
    }
    
    // Remove any AI players marked as dead
    this.removeDeadAIPlayers();
  }
    /**
   * Spawns a new AI player at a collision-free location
   */
  private spawnAIPlayer(humanPlayer: Player, boxes: Box[]
  ): void {
    // Don't spawn if we're at max capacity
    if (this.aiPlayers.length >= this.config.maxBots) return;
    
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
        
        const testX = spawnPoint.x + offsetX;
        const testY = spawnPoint.y + offsetY;
        
        if (checkMapSpawnPosition(testX, testY, newAIPlayer.size, boxes)) {
          newAIPlayer.x = testX;
          newAIPlayer.y = testY;
          foundValidPosition = true;
        }
        attempts++;
      }
      
      if (!foundValidPosition) {
        console.warn("Could not find a valid spawn position for AI player");
        return; // Don't spawn if we can't find a valid position
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
    // Find indices of dead AI players
    const deadIndices: number[] = [];
    for (let i = 0; i < this.aiPlayers.length; i++) {
      if (this.aiPlayers[i].isDead) {
        deadIndices.push(i);
      }
    }
    
    // Remove them in reverse order to avoid index shifting issues
    for (let i = deadIndices.length - 1; i >= 0; i--) {
      const index = deadIndices[i];
      this.aiPlayers.splice(index, 1);
      this.aiVisions.splice(index, 1);
    }
  }
  
  /**
   * Marks an AI player as dead
   */
  markAIDead(aiId: string): void {
    const index = this.aiPlayers.findIndex(ai => ai.id === aiId);
    if (index !== -1) {
      this.aiPlayers[index].isDead = true;
    }
  }
  
  /**
   * Gets all active AI players
   */
  getAIPlayers(): Player[] {
    return this.aiPlayers.filter(ai => !ai.isDead);
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
