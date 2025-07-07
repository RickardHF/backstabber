// Sprite rendering system for custom character graphics
import { Player } from './types';

// Sprite configuration
export interface SpriteConfig {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  animationSpeed: number; // frames per second
  spriteSheetUrl?: string; // Optional URL to sprite sheet image
  useImageFile?: boolean; // Whether to load from image file or generate procedurally
}

// Character sprite manager
export class CharacterSprite {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private spriteImage: HTMLImageElement | null = null;
  private config: SpriteConfig;
  private animationTime: number = 0;
  private idleAnimationTime: number = 0;
  private imageLoaded: boolean = false;
  
  constructor(config: SpriteConfig) {
    this.config = config;
    this.canvas = document.createElement('canvas');
    this.canvas.width = config.frameWidth;
    this.canvas.height = config.frameHeight;
    this.ctx = this.canvas.getContext('2d')!;
    
    if (config.useImageFile && config.spriteSheetUrl) {
      this.loadImageSprite(config.spriteSheetUrl);
    } else {
      this.createCharacterSprite();
    }
  }
  // Load sprite from image file
  private loadImageSprite(url: string) {
    this.spriteImage = new Image();
    
    // Add crossOrigin to prevent CORS issues
    this.spriteImage.crossOrigin = 'anonymous';
    
    this.spriteImage.onload = () => {
      this.imageLoaded = true;
      console.log(`Sprite sheet loaded successfully: ${url}`);
      console.log(`Image dimensions: ${this.spriteImage!.width}x${this.spriteImage!.height}`);
    };
    
    this.spriteImage.onerror = (error) => {
      console.error(`Failed to load sprite sheet: ${url}`, error);
      console.log('Attempting to load with alternative paths...');
      
      // Try alternative paths for deployment compatibility
      const alternativePaths = [
        `${window.location.origin}/sprites/charactersprites.png`,
        `./sprites/charactersprites.png`,
        `/public/sprites/charactersprites.png`,
        // Add cache-busting version
        `/sprites/charactersprites.png?v=${Date.now()}`
      ];
      
      this.tryAlternativePaths(alternativePaths, 0);
    };
    
    // Add cache-busting parameter for better deployment compatibility
    const cacheBustingUrl = url.includes('?') ? `${url}&v=${Date.now()}` : `${url}?v=${Date.now()}`;
    this.spriteImage.src = cacheBustingUrl;
  }
    // Try alternative image paths if the main one fails
  private tryAlternativePaths(paths: string[], index: number) {
    if (index >= paths.length) {
      console.warn('All sprite paths failed, falling back to procedural generation');
      // Fallback to procedural generation
      this.createCharacterSprite();
      return;
    }
    
    const testImage = new Image();
    const currentPath = paths[index];
    
    // Add crossOrigin for CORS compatibility
    testImage.crossOrigin = 'anonymous';
    
    testImage.onload = () => {
      console.log(`Alternative sprite path successful: ${currentPath}`);
      console.log(`Image dimensions: ${testImage.width}x${testImage.height}`);
      this.spriteImage = testImage;
      this.imageLoaded = true;
    };
    
    testImage.onerror = () => {
      console.log(`Alternative path failed: ${currentPath}`);
      // Try next path
      this.tryAlternativePaths(paths, index + 1);
    };
    
    testImage.src = currentPath;
  }
  
  // Create a procedural character sprite (person viewed from above)
  private createCharacterSprite() {
    const { frameWidth, frameHeight, frameCount } = this.config;
    
    // Create a canvas for the sprite sheet
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = frameWidth * frameCount;
    spriteCanvas.height = frameHeight * 8; // 8 directions
    const spriteCtx = spriteCanvas.getContext('2d')!;
    
    // Draw character sprites for all 8 directions and animation frames
    for (let direction = 0; direction < 8; direction++) {
      for (let frame = 0; frame < frameCount; frame++) {
        const x = frame * frameWidth;
        const y = direction * frameHeight;
        
        this.drawCharacterFrame(spriteCtx, x, y, frameWidth, frameHeight, direction, frame);
      }
    }
    
    // Convert canvas to image
    this.spriteImage = new Image();
    this.spriteImage.src = spriteCanvas.toDataURL();
  }
  
  // Draw a single character frame
  private drawCharacterFrame(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    direction: number,
    frame: number
  ) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const scale = Math.min(width, height) / 32; // Base size 32px
    
    // Save context
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // Apply slight animation offset for walking
    const walkOffset = frame > 0 ? Math.sin(frame * 0.5) * 1 : 0;
    
    // Body (oval shape for person from above)
    ctx.fillStyle = '#4A90E2'; // Blue shirt
    ctx.beginPath();
    ctx.ellipse(0, walkOffset, 8 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Head (circle)
    ctx.fillStyle = '#FDBCB4'; // Skin tone
    ctx.beginPath();
    ctx.arc(0, -6 * scale + walkOffset, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Hair
    ctx.fillStyle = '#654321'; // Brown hair
    ctx.beginPath();
    ctx.arc(0, -8 * scale + walkOffset, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw directional indicator (facing direction)
    ctx.fillStyle = '#2C3E50'; // Dark color for direction indicator
    ctx.beginPath();
    
    // Direction angles (0 = North, 1 = NE, 2 = E, etc.)
    const directionAngle = direction * Math.PI / 4;
    const indicatorX = Math.sin(directionAngle) * 6 * scale;
    const indicatorY = -Math.cos(directionAngle) * 6 * scale + walkOffset;
    
    // Small triangle indicating facing direction
    ctx.moveTo(indicatorX, indicatorY);
    ctx.lineTo(indicatorX - 2 * scale, indicatorY + 3 * scale);
    ctx.lineTo(indicatorX + 2 * scale, indicatorY + 3 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Arms (simple lines extending from body)
    ctx.strokeStyle = '#FDBCB4'; // Skin tone
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    // Left arm
    ctx.moveTo(-6 * scale, 2 * scale + walkOffset);
    ctx.lineTo(-10 * scale, 6 * scale + walkOffset);
    // Right arm
    ctx.moveTo(6 * scale, 2 * scale + walkOffset);
    ctx.lineTo(10 * scale, 6 * scale + walkOffset);
    ctx.stroke();
    
    // Legs (simple lines extending from body)
    ctx.strokeStyle = '#2C3E50'; // Dark pants
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    // Left leg
    ctx.moveTo(-3 * scale, 8 * scale + walkOffset);
    ctx.lineTo(-3 * scale, 14 * scale + walkOffset);
    // Right leg
    ctx.moveTo(3 * scale, 8 * scale + walkOffset);
    ctx.lineTo(3 * scale, 14 * scale + walkOffset);
    ctx.stroke();
    
    // Restore context
    ctx.restore();
  }
    // Get the current animation frame
  private getCurrentFrame(deltaTime: number): number {
    this.animationTime += deltaTime;
    const frameTime = 1000 / this.config.animationSpeed; // ms per frame
    return Math.floor(this.animationTime / frameTime) % this.config.frameCount;
  }
  // Get the current attack animation frame
  private getCurrentAttackFrame(deltaTime: number): number {
    this.animationTime += deltaTime;
    const frameTime = 1000 / (this.config.animationSpeed * 1.5); // Faster animation for attacks
    return Math.floor(this.animationTime / frameTime) % 4; // 4 attack frames
  }
  
  // Get the current idle animation frame (slower animation)
  private getCurrentIdleFrame(deltaTime: number): number {
    this.idleAnimationTime += deltaTime;
    const idleFrameTime = 1000 / (this.config.animationSpeed * 0.5); // Half speed for idle
    return Math.floor(this.idleAnimationTime / idleFrameTime) % this.config.frameCount;
  }
  
  // Convert player rotation to sprite direction (0-7)
  private getDirectionFromRotation(rotation: number): number {
    // Normalize rotation to 0-2π
    const normalizedRotation = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    
    // Convert to 8 directions (0 = North, 1 = NE, etc.)
    const direction = Math.round(normalizedRotation / (Math.PI / 4)) % 8;
    return direction;
  }
  // Render the character sprite
  public render(
    ctx: CanvasRenderingContext2D,
    player: Player,
    deltaTime: number,
    isAI: boolean = false
  ) {
    if (!this.spriteImage) return;
    
    // If using image file, wait for it to load
    if (this.config.useImageFile && !this.imageLoaded) {
      // Draw a simple placeholder while loading
      ctx.fillStyle = isAI ? '#FF6B6B' : '#4A90E2';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
      ctx.fill();
      return;
    }    const { frameWidth, frameHeight } = this.config;
    const isMoving = player.direction !== 'none';
    const isAttacking = player.isAttacking || false;
    
    // Determine which animation to use and get the appropriate frame
    let frame: number;
    let sourceX: number;
    
    if (isAttacking) {
      // Attack animation - 3rd column (column index 2), 4 frames
      frame = this.getCurrentAttackFrame(deltaTime);
      sourceX = frameWidth * 2; // 3rd column (0-indexed)
    } else if (isMoving) {
      // Moving animation - 2nd column (column index 1), 17 frames
      frame = this.getCurrentFrame(deltaTime);
      sourceX = frameWidth; // 2nd column
    } else {
      // Idle animation - 1st column (column index 0), 17 frames
      frame = this.getCurrentIdleFrame(deltaTime);
      sourceX = 0; // 1st column
    }
    
    const sourceY = frame * frameHeight; // Row based on animation frame
      // Calculate destination size (scale with player size)
    const destSize = player.size * 2.5; // Increased from 2 to 2.5 to make character look larger
    const destX = player.x - destSize / 2;
    const destY = player.y - destSize / 2;      // Save context for rotation
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation + Math.PI / 2); // Add 90 degrees to align with upward-facing sprite
    ctx.translate(-player.x, -player.y);
    
    // Apply color tint for AI players
    if (isAI) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#FF6B6B'; // Red tint for AI
      ctx.fillRect(destX, destY, destSize, destSize);
      ctx.globalCompositeOperation = 'source-over';
    }
      // Draw the sprite
    ctx.drawImage(
      this.spriteImage,
      sourceX, sourceY, frameWidth, frameHeight,
      destX, destY, destSize, destSize
    );
    
    if (isAI) {
      ctx.restore();
    }
    
    // Restore rotation context
    ctx.restore();
    
    // Draw player label (after restoring rotation so text stays upright)
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeText(isAI ? 'AI' : 'P1', player.x, player.y + destSize / 2 + 15);
    ctx.fillText(isAI ? 'AI' : 'P1', player.x, player.y + destSize / 2 + 15);
  }
}

// Create sprite instances
export const createCharacterSprite = (config: SpriteConfig = {
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 17, // 17 movement frames for walking animation
  animationSpeed: 12, // 12 fps for smoother animation with more frames
  useImageFile: true, // Use image file by default
  spriteSheetUrl: '/sprites/charactersprites.png' // Path to sprite sheet in public folder
}) => {
  return new CharacterSprite(config);
};

// Create sprite from image file
export const createCharacterSpriteFromImage = (
  spriteSheetUrl: string,
  config: Partial<SpriteConfig> = {}
) => {
  const fullConfig: SpriteConfig = {
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 17, // 17 movement frames
    animationSpeed: 12, // 12 fps for smoother animation
    useImageFile: true,
    spriteSheetUrl,
    ...config
  };
  return new CharacterSprite(fullConfig);
};

// Preload sprite images to ensure they're available in deployment
export const preloadSpriteImage = async (url: string = '/sprites/charactersprites.png'): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      console.log(`Sprite preloaded successfully: ${url}`);
      resolve(true);
    };
    img.onerror = (error) => {
      console.error(`Failed to preload sprite: ${url}`, error);
      resolve(false);
    };
    img.src = url;
  });
};
