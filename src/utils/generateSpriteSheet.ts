// Utility to generate a sample sprite sheet and save it as PNG
// This is a one-time utility to create a sprite sheet file

export const generateSampleSpriteSheet = async (): Promise<string> => {
  const frameWidth = 32;
  const frameHeight = 32;
  const frameCount = 4;
  const directions = 8;
  
  // Create a canvas for the sprite sheet
  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * frameCount;
  canvas.height = frameHeight * directions;
  const ctx = canvas.getContext('2d')!;
  
  // Clear background
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw character sprites for all 8 directions and animation frames
  for (let direction = 0; direction < directions; direction++) {
    for (let frame = 0; frame < frameCount; frame++) {
      const x = frame * frameWidth;
      const y = direction * frameHeight;
      
      drawCharacterFrame(ctx, x, y, frameWidth, frameHeight, direction, frame);
    }
  }
  
  // Return data URL
  return canvas.toDataURL('image/png');
};

// Draw a single character frame (copied from sprites.ts)
function drawCharacterFrame(
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
  const scale = Math.min(width, height) / 32;
  
  ctx.save();
  ctx.translate(centerX, centerY);
  
  // Animation offset
  const walkOffset = frame > 0 ? Math.sin(frame * 0.5) * 1 : 0;
  
  // Body
  ctx.fillStyle = '#4A90E2';
  ctx.beginPath();
  ctx.ellipse(0, walkOffset, 8 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head
  ctx.fillStyle = '#FDBCB4';
  ctx.beginPath();
  ctx.arc(0, -6 * scale + walkOffset, 4 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Hair
  ctx.fillStyle = '#654321';
  ctx.beginPath();
  ctx.arc(0, -8 * scale + walkOffset, 3 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Direction indicator
  ctx.fillStyle = '#2C3E50';
  ctx.beginPath();
  const directionAngle = direction * Math.PI / 4;
  const indicatorX = Math.sin(directionAngle) * 6 * scale;
  const indicatorY = -Math.cos(directionAngle) * 6 * scale + walkOffset;
  
  ctx.moveTo(indicatorX, indicatorY);
  ctx.lineTo(indicatorX - 2 * scale, indicatorY + 3 * scale);
  ctx.lineTo(indicatorX + 2 * scale, indicatorY + 3 * scale);
  ctx.closePath();
  ctx.fill();
  
  // Arms
  ctx.strokeStyle = '#FDBCB4';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(-6 * scale, 2 * scale + walkOffset);
  ctx.lineTo(-10 * scale, 6 * scale + walkOffset);
  ctx.moveTo(6 * scale, 2 * scale + walkOffset);
  ctx.lineTo(10 * scale, 6 * scale + walkOffset);
  ctx.stroke();
  
  // Legs
  ctx.strokeStyle = '#2C3E50';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(-3 * scale, 8 * scale + walkOffset);
  ctx.lineTo(-3 * scale, 14 * scale + walkOffset);
  ctx.moveTo(3 * scale, 8 * scale + walkOffset);
  ctx.lineTo(3 * scale, 14 * scale + walkOffset);
  ctx.stroke();
  
  ctx.restore();
}

// Function to download the generated sprite sheet
export const downloadSpriteSheet = async () => {
  const dataUrl = await generateSampleSpriteSheet();
  const link = document.createElement('a');
  link.download = 'character-sprite.png';
  link.href = dataUrl;
  link.click();
};
