import { Box } from './types';

// Spawn point coordinates based on the layout image
export interface SpawnPoint {
  x: number;
  y: number;
}

// Fixed layout configuration
export let MAP_CONFIG = {
  // Canvas dimensions
  width: 800,
  height: 600,
  
  // User spawn point (U in the image) - appears to be on the left side
  userSpawnPoint: { x: 150, y: 300 },
  
  // AI spawn points (X marks in the image)
  aiSpawnPoints: [
    { x: 650, y: 150 },  // Top right area
    { x: 650, y: 450 },  // Bottom right area  
    { x: 400, y: 100 },  // Top center area
    { x: 400, y: 500 },  // Bottom center area
  ],
  maxBots: 2 // default, can be overridden by map property
};

// Generate the fixed wall layout based on the image
export const generateMapLayout = (canvasWidth: number = 800, canvasHeight: number = 600): Box[] => {
  const walls: Box[] = [];
  
  // Wall thickness
  const wallThickness = 20;
  
  // Outer boundary walls
  // Top wall
  walls.push({
    id: 'wall-top',
    x: canvasWidth / 2,
    y: wallThickness / 2,
    width: canvasWidth,
    height: wallThickness,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(canvasWidth, wallThickness) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Bottom wall
  walls.push({
    id: 'wall-bottom',
    x: canvasWidth / 2,
    y: canvasHeight - wallThickness / 2,
    width: canvasWidth,
    height: wallThickness,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(canvasWidth, wallThickness) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Left wall
  walls.push({
    id: 'wall-left',
    x: wallThickness / 2,
    y: canvasHeight / 2,
    width: wallThickness,
    height: canvasHeight,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(wallThickness, canvasHeight) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Right wall
  walls.push({
    id: 'wall-right',
    x: canvasWidth - wallThickness / 2,
    y: canvasHeight / 2,
    width: wallThickness,
    height: canvasHeight,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(wallThickness, canvasHeight) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Inner walls creating the layout from the image
  
  // Top horizontal wall (creating top corridor)
  walls.push({
    id: 'wall-inner-top',
    x: canvasWidth / 2,
    y: canvasHeight * 0.25,
    width: canvasWidth * 0.6, // Leaves gaps on sides
    height: wallThickness,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(canvasWidth * 0.6, wallThickness) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Bottom horizontal wall (creating bottom corridor)
  walls.push({
    id: 'wall-inner-bottom',
    x: canvasWidth / 2,
    y: canvasHeight * 0.75,
    width: canvasWidth * 0.6, // Leaves gaps on sides
    height: wallThickness,
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(canvasWidth * 0.6, wallThickness) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Left vertical wall section
  walls.push({
    id: 'wall-inner-left',
    x: canvasWidth * 0.3,
    y: canvasHeight / 2,
    width: wallThickness,
    height: canvasHeight * 0.3, // Shorter to create passages
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(wallThickness, canvasHeight * 0.3) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  // Right vertical wall section
  walls.push({
    id: 'wall-inner-right',
    x: canvasWidth * 0.7,
    y: canvasHeight / 2,
    width: wallThickness,
    height: canvasHeight * 0.3, // Shorter to create passages
    color: '#666666',
    direction: 'none',
    speed: 0,
    size: Math.max(wallThickness, canvasHeight * 0.3) / 2,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  });
  
  return walls;
};

// Get a random AI spawn point
export const getRandomAISpawnPoint = (): SpawnPoint => {
  const spawnPoints = MAP_CONFIG.aiSpawnPoints;
  return spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
};

// Get the user spawn point
export const getUserSpawnPoint = (): SpawnPoint => {
  return MAP_CONFIG.userSpawnPoint;
};

// Check if a position is valid for spawning (not inside walls)
export const isValidSpawnPosition = (x: number, y: number, size: number, walls: Box[]): boolean => {
  const buffer = 10; // Additional buffer around walls
  
  for (const wall of walls) {
    const playerLeft = x - size - buffer;
    const playerRight = x + size + buffer;
    const playerTop = y - size - buffer;
    const playerBottom = y + size + buffer;
    
    const wallLeft = wall.x - wall.width / 2;
    const wallRight = wall.x + wall.width / 2;
    const wallTop = wall.y - wall.height / 2;
    const wallBottom = wall.y + wall.height / 2;
    
    // Check if player would overlap with wall
    if (playerLeft < wallRight && playerRight > wallLeft && 
        playerTop < wallBottom && playerBottom > wallTop) {
      return false;
    }
  }
  
  return true;
};

// ---------------- Tiled (.tmj) map loading support ----------------

// Tiled custom property (value can be several primitive types)
interface TiledProperty { name: string; type: string; value: string | number | boolean | null }
interface TiledObject {
  id: number;
  name: string;
  type: string; // 'wall' | 'spawn'
  x: number; // For rectangle objects: top-left; for point objects: the point
  y: number;
  width?: number;
  height?: number;
  point?: boolean;
  properties?: TiledProperty[];
}
interface TiledLayer { id: number; name: string; type: string; width?: number; height?: number; data?: number[]; objects?: TiledObject[] }
// Tiled 1.11 JSON can export map-level properties either as an array of objects
// (default verbose mode) or as a compact key/value object when "Export compact JSON"
// is enabled. Support both here so map authors can choose either format.
interface TiledMap { width: number; height: number; tilewidth: number; tileheight: number; layers: TiledLayer[]; properties?: TiledProperty[] | Record<string, unknown> }

export interface TileMapData {
  width: number;         // tiles
  height: number;        // tiles
  tileWidth: number;     // px
  tileHeight: number;    // px
  data: number[];        // flattened tile GIDs
}

let loadedTileMap: TileMapData | null = null;
export const getTileMap = () => loadedTileMap;

let tiledLoaded = false;
let cachedBoxes: Box[] = [];

const WALL_COLOR = '#666666';

const toBox = (obj: TiledObject): Box => {
  const width = obj.width || 0;
  const height = obj.height || 0;
  const centerX = obj.x + width / 2;
  const centerY = obj.y + height / 2;
  const size = Math.max(width, height) / 2;
  return {
    id: obj.name || `wall-${obj.id}`,
    x: centerX,
    y: centerY,
    width,
    height,
    color: WALL_COLOR,
    direction: 'none',
    speed: 0,
    size,
    pulse: 0,
    rotation: 0,
    rotationSpeed: 0
  };
};

export const hasTiledMapLoaded = () => tiledLoaded;
export const getTiledMapBoxes = () => cachedBoxes;

export const loadMapFromTiled = async (url: string): Promise<Box[]> => {
  if (tiledLoaded && cachedBoxes.length) return cachedBoxes;
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-cache' });
  } catch (e) {
    throw new Error(`Network error loading Tiled map: ${(e as Error).message}`);
  }
  if (!response.ok) throw new Error(`Failed to load Tiled map ${url}: ${response.status}`);
  const data: TiledMap = await response.json();

  // Update map dimensions (pixels)
  const pixelWidth = data.width * data.tilewidth;
  const pixelHeight = data.height * data.tileheight;
  MAP_CONFIG = { ...MAP_CONFIG, width: pixelWidth, height: pixelHeight };

  // Map-level properties (e.g. maxBots) with alias support
  if (data.properties) {
    const maxBotPropAliases = ['maxBots','maxbots','maxAI','maxAi','maxai','maxEnemies','maxEnemy','enemies'];
    let candidateValue: number | null = null;
    if (Array.isArray(data.properties)) {
      // Standard Tiled export format
      const found = (data.properties as TiledProperty[]).find(p => maxBotPropAliases.includes(p.name));
      if (found && typeof found.value === 'number' && !Number.isNaN(found.value)) {
        candidateValue = found.value;
      }
    } else if (typeof data.properties === 'object') {
      // Compact export: properties as a plain object
      for (const alias of maxBotPropAliases) {
        if (Object.prototype.hasOwnProperty.call(data.properties, alias)) {
          const raw = (data.properties as Record<string, unknown>)[alias];
          if (typeof raw === 'number' && !Number.isNaN(raw)) {
            candidateValue = raw;
            break;
          }
        }
      }
    }
    if (candidateValue !== null) {
      const coerced = Math.max(0, Math.floor(candidateValue));
      if (coerced > 0) {
        MAP_CONFIG = { ...MAP_CONFIG, maxBots: coerced } as typeof MAP_CONFIG;
        console.log('[MapLayout] maxBots override from map properties =>', coerced);
      } else {
        console.warn('[MapLayout] Ignoring non-positive maxBots value from map properties', candidateValue);
      }
    }
  }

  const walls: Box[] = [];
  const aiSpawns: { x: number; y: number }[] = [];
  let userSpawn: { x: number; y: number } | null = null;
  // Find first tile layer (e.g., Ground) and build collision from wall tiles (gid 2)
  const tileLayer = data.layers.find(l => l.type === 'tilelayer' && Array.isArray(l.data));
  if (tileLayer && tileLayer.data) {
    loadedTileMap = {
      width: tileLayer.width || data.width,
      height: tileLayer.height || data.height,
      tileWidth: data.tilewidth,
      tileHeight: data.tileheight,
      data: tileLayer.data
    };
    // If tile layer is entirely empty (all zeros), synthesize a floor fill using gid 1
    if (loadedTileMap.data.every(v => v === 0)) {
      loadedTileMap.data = loadedTileMap.data.map(() => 1);
    }
    const W = loadedTileMap.width;
    const H = loadedTileMap.height;
    const tw = loadedTileMap.tileWidth;
    const th = loadedTileMap.tileHeight;
    for (let y = 0; y < H; y++) {
      let runStart = -1;
      for (let x = 0; x <= W; x++) {
        const idx = y * W + x;
        const gid = x < W ? loadedTileMap.data[idx] : 0; // sentinel 0 at row end
        const isWall = gid === 2; // second tile = wall
        if (isWall && runStart === -1) runStart = x;
        if ((!isWall || x === W) && runStart !== -1) {
          const runEnd = x - 1;
          const tilesWide = runEnd - runStart + 1;
            const pxX = runStart * tw;
          const pxY = y * th;
          walls.push({
            id: `wall-${y}-${runStart}`,
            x: pxX + (tilesWide * tw) / 2,
            y: pxY + th / 2,
            width: tilesWide * tw,
            height: th,
            color: WALL_COLOR,
            direction: 'none',
            speed: 0,
            size: Math.max(tilesWide * tw, th) / 2,
            pulse: 0,
            rotation: 0,
            rotationSpeed: 0
          });
          runStart = -1;
        }
      }
    }
  }

  // Also parse wall objects (object layer) into collision boxes so maps that rely on objects still work
  for (const layer of data.layers) {
    if (layer.type === 'objectgroup' && layer.objects) {
      for (const obj of layer.objects) {
        if ((obj.type || '').toLowerCase() === 'wall') {
          walls.push(toBox(obj));
        }
      }
    }
  }

  // Spawn points from any object layer containing 'spawn'
  for (const layer of data.layers) {
    if (layer.type !== 'objectgroup' || !layer.objects) continue;
    const lname = layer.name.toLowerCase();
    if (!lname.includes('spawn')) continue;
    for (const obj of layer.objects) {
      if (obj.type === 'spawn') {
        const spawnTypeProp = obj.properties?.find(p => p.name === 'spawnType');
        const spawnType = (spawnTypeProp?.value || obj.name || '').toString().toLowerCase();
        // Clamp spawn inside world bounds (use a small margin so we stay visible)
        let sx = obj.x;
        let sy = obj.y;
        const margin = 8; // pixels
        const maxX = pixelWidth - margin;
        const maxY = pixelHeight - margin;
        const originalX = sx;
        const originalY = sy;
        if (sx < margin) sx = margin;
        if (sy < margin) sy = margin;
        if (sx > maxX) sx = maxX;
        if (sy > maxY) sy = maxY;
        if (sx !== originalX || sy !== originalY) {
          console.warn(`[MapLayout] Spawn '${obj.name}' out of bounds (${originalX},${originalY}) clamped to (${sx},${sy}) within world ${pixelWidth}x${pixelHeight}`);
        }
        if (spawnType.includes('user')) {
          userSpawn = { x: sx, y: sy };
        } else if (spawnType.includes('ai')) {
          // Only accept AI spawn if not inside a wall
          if (isValidSpawnPosition(sx, sy, 20, walls)) {
            aiSpawns.push({ x: sx, y: sy });
          } else {
            console.warn(`[MapLayout] Ignoring AI spawn '${obj.name}' at (${sx},${sy}) due to wall overlap`);
          }
        }
      }
    }
  }

  if (userSpawn) {
    MAP_CONFIG = { ...MAP_CONFIG, userSpawnPoint: userSpawn } as typeof MAP_CONFIG;
  }
  if (aiSpawns.length) {
    MAP_CONFIG = { ...MAP_CONFIG, aiSpawnPoints: aiSpawns } as typeof MAP_CONFIG;
  }

  cachedBoxes = walls;
  tiledLoaded = true;
  return walls;
};

