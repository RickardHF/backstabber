/**
 * Shared utility functions for game mechanics
 */

import { Direction, Player, Box } from './types';

/**
 * Converts a rotation angle (in radians) to a cardinal direction
 * @param rotation - Rotation angle in radians (0-2π)
 * @returns The corresponding cardinal direction
 */
export const rotationToDirection = (rotation: number): Direction => {
  if (rotation >= 7 * Math.PI / 4 || rotation < Math.PI / 4) {
    return 'right';
  } else if (rotation >= Math.PI / 4 && rotation < 3 * Math.PI / 4) {
    return 'down';
  } else if (rotation >= 3 * Math.PI / 4 && rotation < 5 * Math.PI / 4) {
    return 'left';
  } else {
    return 'up';
  }
};

/**
 * Normalizes an angle difference to the range [-π, π]
 * @param angleDiff - The angle difference to normalize
 * @returns The normalized angle difference
 */
export const normalizeAngleDifference = (angleDiff: number): number => {
  let normalized = angleDiff;
  while (normalized > Math.PI) normalized -= 2 * Math.PI;
  while (normalized < -Math.PI) normalized += 2 * Math.PI;
  return normalized;
};

/**
 * Normalizes a rotation angle to the range [0, 2π]
 * @param rotation - The rotation angle to normalize
 * @returns The normalized rotation angle
 */
export const normalizeRotation = (rotation: number): number => {
  const twoPi = Math.PI * 2;
  let normalized = rotation % twoPi;
  if (normalized < 0) normalized += twoPi;
  return normalized;
};

/**
 * Converts a player to a box representation for collision detection
 * @param player - The player to convert
 * @returns A box representation of the player
 */
export const playerToBox = (player: Player): Box => {
  return {
    ...player,
    width: player.size * 2,
    height: player.size * 2,
    color: 'collision-box' // Used for collision detection only, not rendered
  };
};

/**
 * Calculates the angle from one point to another
 * @param fromX - X coordinate of the starting point
 * @param fromY - Y coordinate of the starting point
 * @param toX - X coordinate of the target point
 * @param toY - Y coordinate of the target point
 * @returns The angle in radians
 */
export const calculateAngleTo = (fromX: number, fromY: number, toX: number, toY: number): number => {
  return Math.atan2(toY - fromY, toX - fromX);
};

/**
 * Calculates the distance between two points
 * @param x1 - X coordinate of the first point
 * @param y1 - Y coordinate of the first point
 * @param x2 - X coordinate of the second point
 * @param y2 - Y coordinate of the second point
 * @returns The distance between the points
 */
export const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

/**
 * Checks if an angle is within a vision cone
 * @param angleToTarget - Angle to the target in radians
 * @param facingAngle - Angle the entity is facing in radians
 * @param visionConeAngleDegrees - Width of the vision cone in degrees
 * @returns True if the target is within the vision cone
 */
export const isWithinVisionCone = (
  angleToTarget: number,
  facingAngle: number,
  visionConeAngleDegrees: number
): boolean => {
  const visionConeAngleRad = (visionConeAngleDegrees * Math.PI) / 180;
  let angleDiff = Math.abs(angleToTarget - facingAngle);
  if (angleDiff > Math.PI) {
    angleDiff = 2 * Math.PI - angleDiff;
  }
  return angleDiff <= visionConeAngleRad / 2;
};
