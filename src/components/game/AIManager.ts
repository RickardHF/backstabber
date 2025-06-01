import { Player, AIVision, AIManagerConfig } from './types';
import { aiDirectionColors } from './constants';
import { updateAiPlayer } from './AIPlayer';
import { checkPlayerBoxCollision, checkPlayerCollision } from './collision';

/**
 * Manages multiple AI players, handling spawning, updating, and despawning
 */
export class AIManager {
  private aiPlayers: Player[] = [];
  private aiVisions: AIVision[] = [];
  private config: AIManagerConfig;
  private nextSpawnTime: number = 0;
  
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
    boxes: any[], 
    currentTime: number
  ): void {
    // Check if we need to spawn a new AI player
    if (this.config.enabled && 
        this.aiPlayers.length < this.config.maxBots && 
        currentTime >= this.nextSpawnTime) {
      console.log("Spawning AI player at time:", currentTime);
      this.spawnAIPlayer(player, boxes, canvas);
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
        this.aiPlayers.filter(p => p.id !== aiPlayer.id && !p.isDead)
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
  private spawnAIPlayer(humanPlayer: Player, boxes: any[], canvas: HTMLCanvasElement | null): void {
    // Don't spawn if we're at max capacity
    if (this.aiPlayers.length >= this.config.maxBots) return;
    
    // Get canvas dimensions if available
    const canvasWidth = canvas ? canvas.width : 800;
    const canvasHeight = canvas ? canvas.height : 600;
    
    // Create a new AI player with initial spawn location
    const newAIPlayer: Player = {
      id: `ai-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: this.config.spawnLocation.x,
      y: this.config.spawnLocation.y,
      direction: 'right',
      speed: 0.5, // Slower than human player
      size: 20,
      pulse: Math.PI * Math.random(), // Random starting phase
      isAI: true,
      isDead: false,
      rotation: Math.random() * Math.PI * 2, // Random starting rotation
      rotationSpeed: 0.08 // Slightly slower rotation than the player
    };
    
    // Try to find a collision-free spawn position, with max attempts to prevent infinite loops
    const maxAttempts = 50;
    let attempts = 0;
    
    while (!this.isValidSpawnPosition(newAIPlayer, humanPlayer, boxes) && attempts < maxAttempts) {
      // Generate a new random position within the canvas boundaries
      // Keep some margin from the edges
      const margin = newAIPlayer.size * 2;
      newAIPlayer.x = margin + Math.random() * (canvasWidth - margin * 2);
      newAIPlayer.y = margin + Math.random() * (canvasHeight - margin * 2);
      attempts++;
    }
    
    // Log if we couldn't find a collision-free position after max attempts
    if (attempts >= maxAttempts) {
      console.warn("Could not find a collision-free spawn position after", attempts, "attempts");
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
  private isValidSpawnPosition(aiPlayer: Player, humanPlayer: Player, boxes: any[]): boolean {
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
