import { Player, Direction } from './types';
import { drawGrid, drawAiVisionCone, drawPlayer } from './rendering';

export interface GameUIProps {
  player: Player;
  aiPlayer: Player;
  canSeePlayer: boolean;
  visionConeAngle: number;
  visionDistance: number;
  directionColors: { [key in Direction]: string };
  aiDirectionColors: { [key in Direction]: string };
}

export const renderGame = (
  ctx: CanvasRenderingContext2D | null, 
  canvas: HTMLCanvasElement | null, 
  props: GameUIProps
) => {
  if (!ctx || !canvas) return;

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw a grid for the top-down view
  drawGrid(ctx, canvas);
  
  // Draw the AI vision cone first so it appears behind the players
  drawAiVisionCone(
    ctx, 
    props.aiPlayer, 
    props.canSeePlayer, 
    props.visionConeAngle, 
    props.visionDistance
  );
    
  // Then draw AI player
  drawPlayer(ctx, props.aiPlayer);
    
  // Finally draw human player (so it appears on top if they overlap)
  drawPlayer(ctx, props.player);
};
