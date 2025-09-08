# Simple 2D Game

This is a simple 2D top-down game built with Next.js and React, featuring characters that change color based on movement direction.

## Game Features

- Top-down view with grid background
- Two players:
  - Human player controlled with WASD keys
  - AI player that moves randomly around the map
- Both characters change color based on movement direction
- Visual direction indicators showing which way each player is moving
- Player identification labels (P1 for human, AI for computer)

### Player Controls & Colors
- **Human Player:**
  - W (Up): Red
  - S (Down): Teal
  - A (Left): Yellow
  - D (Right): Purple

### AI Player
- Has a 30-degree vision cone in the direction it's facing
- Vision extends to twice its body size
- Changes behavior based on what it sees:
  - If it can't see the player: moves randomly around the map
  - If it can see the player: follows and chases the player
- Vision cone changes color when it detects the player
- Changes direction when hitting walls
- Different color scheme:
  - Up: Purple
  - Down: Blue
  - Left: Orange
  - Right: Green

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Map System (Tiled TMJ)

The arena layout can be authored in the free Tiled editor (`.tmj` JSON). Runtime loads `public/maps/arena.tmj`.

Layers:
1. Walls (object layer): rectangle objects with `type = wall` become collision boxes.
2. Spawns (object layer): point objects with `type = spawn` and property `spawnType` = `user` or `ai`.

Edit workflow:
1. Open `public/maps/arena.tmj` in Tiled.
2. Adjust wall rectangles (map size 20x15 tiles @ 40px -> 800x600 px).
3. Move / add spawn points (set property `spawnType`).
4. Save and refresh the browser.

If loading the TMJ fails the game falls back to the hardcoded layout in `MapLayout.ts`.

Add new maps by placing another `.tmj` in `public/maps/` and calling `loadMapFromTiled('/maps/yourmap.tmj')` early (e.g., in a custom init hook).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
