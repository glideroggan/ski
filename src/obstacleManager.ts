// import p5 from 'p5';
// import { Sprite } from './sprite';
// import { Player} from './player/player';
// import { Game, RenderableObject } from './game';
// import { Position } from './camera';
// import { SpriteAtlas } from './spriteAtlas'; // Import SpriteAtlas
// import { AISkier, AISkierType } from './aiSkier'; // Import AISkier and related types
// import { ICollidable, CollisionHitbox } from './collision/ICollidable'; // Import ICollidable
// import { SkierState } from './skier/skier.entity';

// // Interface for obstacle dimensions
// export interface ObstacleDimensions {
//   width: number;
//   height: number;
// }

// export interface Obstacle extends RenderableObject, ICollidable {
//   worldPos: Position
//   width: number;
//   height: number;
//   type: 'tree' | 'rock' | 'snowman';
//   sprite: Sprite | null;
//   render(p: p5, game: Game): void;  // Add game parameter for coordinate conversion
//   update(scrollSpeed: number, horizontalOffset: number): void;
// }

// // Define collision hitbox offsets for different obstacle types
// export interface CollisionOffset {
//   xOffset: number;
//   yOffset: number;
//   widthFactor: number;
//   heightFactor: number;
// }

// export class ObstacleManager {  private p: p5;
//   obstacles: Obstacle[] = [];
//   private spriteSheet: p5.Image | null = null;
//   private sprites: Map<string, Sprite> = new Map();
//   private temporarySpeedBoost: boolean = false;
//   private spawnCounter: number = 0;
//   private baseSpawnInterval: number = 60; // Base spawn rate (1 per second at 60 FPS)
//   private debug: boolean = false; // Set to true to show collision boxes
//   private game: Game; // Reference to the game for coordinate conversion
//   private types: ('tree' | 'rock' | 'snowman')[] = ['tree', 'rock', 'snowman'];
//   private atlasLoaded: boolean = false;
//   private aiSkierSpawnTimer: number = 0;
//   private aiSkierSpawnInterval: number = 180; // Base spawn interval for AI skiers (3 seconds at 60 FPS)

//   // Store dimensions for each obstacle type
//   private obstacleDimensions: Map<string, ObstacleDimensions> = new Map([
//     ['tree', { width: 60, height: 80 }],
//     ['rock', { width: 40, height: 40 }],
//     ['snowman', { width: 60, height: 60 }],
//     ['aiSkier', { width: 50, height: 80 }]
//   ]);

//   // Collision hitbox adjustments for each obstacle type
//   collisionAdjustments: Map<string, CollisionOffset> = new Map([
//     ['tree', { xOffset: 0, yOffset: 30, widthFactor: 0.4, heightFactor: 0.3 }], // Tree collision at bottom part only
//     ['rock', { xOffset: 0, yOffset: 0, widthFactor: 0.7, heightFactor: 0.6 }],   // Rocks have more uniform hitbox
//     ['snowman', { xOffset: 0, yOffset: 10, widthFactor: 0.5, heightFactor: 0.4 }],
//     ['aiSkier', { xOffset: 0, yOffset: 15, widthFactor: 0.5, heightFactor: 0.3 }], // AI skier collision box
//   ]);


//   constructor(p: p5, game: Game) {
//     this.p = p;
//     this.game = game;
//     this.loadAssets();
//   }

//   public loadAssets(): void {
//     // Create sprite atlas
//     const spriteAtlas = new SpriteAtlas(this.p);

//     // Load the TexturePacker atlas
//     spriteAtlas.loadAtlas('assets/obstacles.json', 'assets/obstacles.png')
//       .then(() => {
//         console.debug("Obstacles sprite atlas loaded successfully");
//         this.setupSpritesFromAtlas(spriteAtlas);
//         this.atlasLoaded = true;
//       })
//       .catch(err => {
//         console.error("Failed to load obstacles sprite atlas:", err);
//       });
//   }

//   private setupSpritesFromAtlas(spriteAtlas: SpriteAtlas): void {
//     if (!spriteAtlas.isLoaded()) {
//       console.error("Cannot setup obstacle sprites: sprite atlas is not loaded");
//       return;
//     }

//     try {
//       // Map TexturePacker frame names to obstacle types
//       const spriteTypeMapping = [
//         { type: 'tree', name: 'tree', scale: 1.7 },
//         { type: 'rock', name: 'rock', scale: 1.0 },
//         { type: 'snowman', name: 'snowman', scale: 1.0 }
//       ];

//       // Add sprites to the map
//       for (const mapping of spriteTypeMapping) {
//         const sprite = spriteAtlas.getSprite(
//           mapping.name + ".png", // Try with extension first
//           false,
//           mapping.scale
//         );

//         if (sprite) {
//           console.debug(`Loaded sprite for obstacle type ${mapping.type}: ${mapping.name}`);
//           this.sprites.set(mapping.type, sprite);
//         } else {
//           console.warn(`Sprite not found for obstacle type ${mapping.type}, name: ${mapping.name}`);
//         }
//       }

//       console.debug(`Loaded ${this.sprites.size} obstacle sprites from atlas`);
//     } catch (error) {
//       console.error("Error setting up obstacle sprites from atlas:", error);
//     }
//   }

//   public setSpriteSheet(spriteSheet: p5.Image): void {
//     // This method is kept for backward compatibility
//     // It will be used as a fallback if the atlas loading fails
//     this.spriteSheet = spriteSheet;
//     this.setupSprites();
//   }

//   private setupSprites(): void {
//     if (!this.spriteSheet) return;

//     // Check if image is loaded properly
//     if (this.spriteSheet.width === 0 || this.spriteSheet.height === 0) {
//       console.error("Obstacle spritesheet has invalid dimensions");
//       return;
//     }

//     try {
//       // Assuming two obstacle types side by side in the spritesheet
//       const numObstacles = 2;
//       let frameWidth = this.spriteSheet.width / numObstacles;
//       const frameHeight = this.spriteSheet.height / 2;

//       // Create sprites for each obstacle type with appropriate scaling
//       this.sprites.set('rock', new Sprite(this.p, this.spriteSheet, 0, 0, frameWidth, frameHeight, false, 1.0));
//       // Make trees bigger with a 1.5x scale factor
//       this.sprites.set('tree', new Sprite(this.p, this.spriteSheet, 0, frameHeight, frameWidth, frameHeight, false, 1.7));

//       this.sprites.set('snowman', new Sprite(this.p, this.spriteSheet, frameWidth, 0, frameWidth, frameHeight, false, 1));
//     } catch (error) {
//       console.error("Error setting up obstacle sprites:", error);
//     }
//   }

//   public update(game: Game): void {
//     // Update existing obstacles
//     for (let i = this.obstacles.length - 1; i >= 0; i--) {
//       // Convert world position to screen coordinates for visibility check
//       const screenPos = game.camera.worldToScreen(this.obstacles[i].worldPos);

//       // Remove obstacles that are far off-screen
//       if (screenPos.y < -200 || screenPos.x < -200 || screenPos.x > this.p.width + 200) {
//         this.obstacles.splice(i, 1);
//       }
//     }

//     // Reset speed boost flag
//     this.temporarySpeedBoost = false;

//     // Spawn new obstacles periodically
//     this.spawnCounter += 1;

//     // Get difficulty level (0-100) and calculate spawn interval
//     const difficultyLevel = game.difficultyManager.getDifficultyLevel();
//     // Higher difficulty = more obstacles (lower spawn interval)
//     const spawnInterval = Math.max(10, this.baseSpawnInterval - (difficultyLevel / 100) * 50);

//     if (this.spawnCounter >= spawnInterval) {
//       this.spawnObstacle(game);
//       this.spawnCounter = 0;
//     }

//     // Update AI skiers
//     this.updateAISkiers();
//   }

//   private spawnObstacle(game: Game): void {
//     // Ensure we have sprites before creating obstacles
//     if (this.sprites.size === 0) {
//       return;
//     }
    
//     // Get current difficulty to adjust obstacle distribution
//     const difficultyLevel = game.difficultyManager.getDifficultyLevel();
    
//     // At higher difficulty, prefer more challenging obstacles
//     let type;
//     if (difficultyLevel > 80 && Math.random() < 0.7) {
//       // 70% chance for trees (more challenging) at high difficulty
//       type = 'tree';
//     } else if (difficultyLevel > 50 && Math.random() < 0.5) {
//       // 50% chance for rocks at medium-high difficulty
//       type = 'rock';
//     } else {
//       // Otherwise random selection
//       type = this.types[Math.floor(Math.random() * this.types.length)];
//     }
    
//     // Get screen dimensions
//     const screenWidth = this.p.width;
//     const screenHeight = this.p.height;
    
//     // Get player state to determine travel direction
//     const playerState = game.player.getCurrentState();
    
//     // Get player's current world position
//     const playerWorldPos = game.player.worldPos;
//     const playerScreenPos = game.camera.worldToScreen(playerWorldPos);
    
//     // Determine where to spawn obstacles based on player's direction and position
//     let screenX, screenY;
    
//     // Check player's current direction
//     const isMovingRight = playerState === SkierState.RIGHT || 
//                          playerState === SkierState.RIGHT_DOWN ||
//                          playerState === SkierState.FLYING_RIGHT || 
//                          playerState === SkierState.FLYING_RIGHT_DOWN;
                         
//     const isMovingLeft = playerState === SkierState.LEFT || 
//                         playerState === SkierState.LEFT_DOWN ||
//                         playerState === SkierState.FLYING_LEFT || 
//                         playerState === SkierState.FLYING_LEFT_DOWN;
    
//     // Determine spawn position - use different strategies
//     // 1. In front of player (below screen)
//     // 2. To the right of player (when moving right)
//     // 3. To the left of player (when moving left)
//     const spawnStrategy = Math.random() < 0.7 ? "front" : 
//                          isMovingRight ? "right" : 
//                          isMovingLeft ? "left" : "front";
    
//     switch(spawnStrategy) {
//       case "front":
//         // Standard spawning in front of player (below screen)
//         if (isMovingRight) {
//           // When moving right, spawn obstacles more to the right
//           screenX = Math.random() * screenWidth * 0.7 + screenWidth * 0.3;
//         } else if (isMovingLeft) {
//           // When moving left, spawn obstacles more to the left
//           screenX = Math.random() * screenWidth * 0.7;
//         } else {
//           // When going straight, use full width with higher probability in center
//           if (Math.random() < 0.6) {
//             // 60% chance of spawning in center region
//             screenX = screenWidth * 0.3 + Math.random() * screenWidth * 0.4;
//           } else {
//             // 40% chance of spawning across full width
//             screenX = Math.random() * screenWidth;
//           }
//         }
//         // Position below the bottom of the screen
//         screenY = screenHeight + 50;
//         break;
        
//       case "right":
//         // Spawn obstacles to the right of the player
//         screenX = screenWidth + 50; // Just off-screen to the right
        
//         // Position at random Y value near player's Y position
//         // Between slightly above and far below player
//         const rightYOffset = Math.random() * screenHeight * 0.7;
//         screenY = playerScreenPos.y - screenHeight * 0.1 + rightYOffset;
//         break;
        
//       case "left":
//         // Spawn obstacles to the left of the player
//         screenX = -50; // Just off-screen to the left
        
//         // Position at random Y value near player's Y position
//         // Between slightly above and far below player
//         const leftYOffset = Math.random() * screenHeight * 0.7;
//         screenY = playerScreenPos.y - screenHeight * 0.1 + leftYOffset;
//         break;
//     }
    
//     // Convert screen position to world position
//     const worldPos = game.camera.screenToWorld({x: screenX, y: screenY});

//     // Get the sprite for this obstacle type
//     const sprite = this.sprites.get(type) || null;
//     if (!sprite) {
//       console.warn(`Sprite for type ${type} not found`);
//       return; // Skip creating obstacles if the sprite isn't available
//     }

//     // Get dimensions from the centralized map
//     const dimensions = this.obstacleDimensions.get(type) || { width: 40, height: 40 }; // Default if not found

//     // Apply the sprite's scale factor to the obstacle dimensions
//     const width = dimensions.width * sprite.getScale();
//     const height = dimensions.height * sprite.getScale();    const obstacle: Obstacle = {
//       worldPos,
//       width,
//       height,
//       type: type as 'tree' | 'rock' | 'snowman',
//       sprite,

//       render: function (p: p5, game: Game): void {
//         if (this.sprite) {
//           // Convert world coordinates to screen coordinates for rendering
//           const screenPos = game.camera.worldToScreen(this.worldPos);

//           // Get weather visibility factor and calculate distance-based opacity
//           const visibilityFactor = game.weatherSystem.getVisibilityFactor();
//           const distanceFromPlayer = Math.abs(this.worldPos.y - game.player.worldPos.y);

//           // Obstacles far away become less visible during bad weather
//           let opacity = 255;
//           if (visibilityFactor > 0) {
//             // Maximum viewing distance decreases as visibility gets worse
//             const maxViewingDistance = 1000 * (1 - visibilityFactor * 0.7);
//             opacity = 255 * Math.max(0, 1 - (distanceFromPlayer / maxViewingDistance));
//           }

//           // Only render if somewhat visible
//           if (opacity > 10) {
//             p.push();
//             if (opacity < 255) {
//               p.tint(255, opacity);
//             }

//             // Get the base dimensions for rendering
//             const baseDimensions = game.obstacleManager.getObstacleDimensions(this.type);
//             this.sprite.render(screenPos.x, screenPos.y, baseDimensions.width, baseDimensions.height);

//             p.pop();
//           }
//         }
//       },

//       getCollisionHitbox: function(): CollisionHitbox {
//         // Use the ObstacleManager's hitbox calculation for consistency
//         const hitbox = game.obstacleManager.getObstacleHitbox(this);
//         return hitbox;
//       },
      
//       handleCollision: function(other: ICollidable): void {
//         // Standard obstacles don't have any special collision behavior
//         // They're immovable so they don't react when hit
//         if (game.debug) {
//           console.debug(`${this.type} was hit by ${other.type}`);
//         }
//       },

//       update: function (scrollSpeed: number, horizontalOffset: number = 0): void {
//         // Obstacles don't need to update their position - they're fixed in world space
//         // The camera movement creates the illusion of obstacle movement
//       },
//     };

//     this.obstacles.push(obstacle);

//     if (this.debug) {
//       console.debug(`Spawned ${type} at world (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
//     }
//   }

//   private spawnAISkier(): void {
//     // Determine skier type based on probabilities
//     const typeRand = Math.random();
//     let skierType: AISkierType;
    
//     if (typeRand < 0.4) {
//       skierType = AISkierType.FAST_VERTICAL; // 40% chance for fast vertical skier
//     } else if (typeRand < 0.7) {
//       skierType = AISkierType.SLOW_VERTICAL; // 30% chance for slow vertical skier
//     } else {
//       skierType = AISkierType.HORIZONTAL; // 30% chance for horizontal skier
//     }
    
//     // Get screen dimensions
//     const screenWidth = this.p.width;
//     const screenHeight = this.p.height;
    
//     // Determine spawn position based on skier type
//     let worldPos: Position;
    
//     if (skierType === AISkierType.FAST_VERTICAL) {
//       // Fast skiers spawn behind the player (above screen) 
//       const screenX = Math.random() * screenWidth;
//       const screenY = -100; // Just above the screen
//       worldPos = this.game.camera.screenToWorld({x: screenX, y: screenY});
//     } else if (skierType === AISkierType.SLOW_VERTICAL) {
//       // Slow skiers spawn ahead of the player (below screen)
//       const screenX = Math.random() * screenWidth;
//       const screenY = screenHeight + 100; // Just below the screen
//       worldPos = this.game.camera.screenToWorld({x: screenX, y: screenY});
//     } else {
//       // Horizontal skiers spawn to the sides
//       const screenY = Math.random() * screenHeight * 0.7 + screenHeight * 0.2; // Not too high or low
//       const screenX = Math.random() > 0.5 ? -50 : screenWidth + 50; // Either left or right of screen
//       worldPos = this.game.camera.screenToWorld({x: screenX, y: screenY});
//     }
    
//     // Determine skier speed based on difficulty and type
//     const difficultyLevel = this.game.difficultyManager.getDifficultyLevel();
//     const playerSpeed = this.game.player.getCurrentSpeed();
    
//     let speed: number;
    
//     if (skierType === AISkierType.FAST_VERTICAL) {
//       // Fast skiers move faster than the player
//       speed = playerSpeed * (1.2 + (difficultyLevel / 100) * 0.5); // 20% to 70% faster than player
//     } else if (skierType === AISkierType.SLOW_VERTICAL) {
//       // Slow skiers move slower than the player
//       speed = playerSpeed * (0.5 + (difficultyLevel / 100) * 0.2); // 50% to 70% of player speed
//     } else {
//       // Horizontal skiers have moderate vertical speed
//       speed = playerSpeed * 0.8;
//     }
    
//     // Randomly select a skier variant (1, 2, or 3)
//     // Variant 1 is the same as the player, so prefer variants 2 and 3
//     const variantType = Math.random() < 0.2 ? 1 : (Math.random() < 0.5 ? 2 : 3);
    
//     // Create the AI skier object (now it loads its own sprites)
//     const aiSkier = new AISkier(
//       this.p,
//       worldPos,
//       skierType,
//       this.game,
//       speed,
//       variantType
//     )
    
//     // Add to obstacles collection
//     this.obstacles.push(aiSkier);
    
//     if (this.debug) {
//       console.debug(`Spawned AI skier of type ${AISkierType[skierType]} (variant ${variantType}) at world (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
//     }
//   }

//   public updateAISkiers(): void {
//     // Increment the AI skier spawn timer
//     this.aiSkierSpawnTimer++;
    
//     // Get current difficulty to adjust AI skier spawn rate
//     const difficultyLevel = this.game.difficultyManager.getDifficultyLevel();
    
//     // Higher difficulty = more AI skiers (reduced spawn interval)
//     const adjustedSpawnInterval = Math.max(60, this.aiSkierSpawnInterval - (difficultyLevel / 100) * 90);
    
//     if (this.aiSkierSpawnTimer >= adjustedSpawnInterval) {
//       this.spawnAISkier();
//       this.aiSkierSpawnTimer = 0;
//     }
//   }

//   /**
//    * Getter for obstacle dimensions
//    */
//   public getObstacleDimensions(type: string): ObstacleDimensions {
//     // Return dimensions for this type, or default if not found
//     return this.obstacleDimensions.get(type) || { width: 40, height: 40 };
//   }

//   /**
//    * Gets the adjusted collision hitbox for an obstacle
//    */
//   public getObstacleHitbox(obstacle: Obstacle): { position: Position, width: number, height: number } {
//     // Get collision adjustment for this obstacle type
//     const adjustment = this.collisionAdjustments.get(obstacle.type) ||
//       { xOffset: 0, yOffset: 0, widthFactor: 0.7, heightFactor: 0.7 }; // Default if type not found

//     // Apply obstacle-specific collision adjustments
//     const adjustedPosition: Position = {
//       x: obstacle.worldPos.x + adjustment.xOffset,
//       y: obstacle.worldPos.y + adjustment.yOffset
//     };

//     const adjustedWidth = obstacle.width * adjustment.widthFactor;
//     const adjustedHeight = obstacle.height * adjustment.heightFactor;

//     return {
//       position: adjustedPosition,
//       width: adjustedWidth,
//       height: adjustedHeight
//     };
//   }

//   /**
//    * Renders debug hitbox for an obstacle
//    */
//   public renderObstacleDebugHitbox(obstacle: Obstacle): void {
//     if (!this.debug || !this.game) return;

//     const hitbox = this.getObstacleHitbox(obstacle);
//     const screenPos = this.game.camera.worldToScreen(hitbox.position);

//     // Draw the collision box
//     this.p.noFill();
//     this.p.stroke(255, 0, 0);
//     this.p.rect(
//       screenPos.x - hitbox.width / 2,
//       screenPos.y - hitbox.height / 2,
//       hitbox.width,
//       hitbox.height
//     );
//   }

//   public render(): void {
//     if (!this.game) return;

//     for (const obstacle of this.obstacles) {
//       obstacle.render(this.p, this.game);

//       // If debug mode is enabled, draw the collision boxes
//       this.renderObstacleDebugHitbox(obstacle);
//     }

//     // Show obstacle count in debug mode
//     if (this.debug) {
//       this.p.fill(255);
//       this.p.textSize(12);
//       this.p.textAlign(this.p.LEFT, this.p.TOP);
//       this.p.text(`Obstacles: ${this.obstacles.length}`, 10, 10);
//     }
//   }

//   public checkCollision(playerWorldX: number, playerWorldY: number, player: Player): Obstacle | null {
//     // Use player's world coordinates for collision detection
//     const playerWidth = player.width;
//     const playerHeight = player.height;

//     // Apply player collision offset for 45-degree perspective
//     const adjustedPlayerX = playerWorldX + player.playerCollisionOffset.xOffset;
//     const adjustedPlayerY = playerWorldY + player.playerCollisionOffset.yOffset;
//     const adjustedPlayerWidth = playerWidth * player.playerCollisionOffset.widthFactor;
//     const adjustedPlayerHeight = playerHeight * player.playerCollisionOffset.heightFactor;

//     // Simple box collision detection with adjusted hitboxes
//     for (const obstacle of this.obstacles) {
//       const obstaclePos = obstacle.worldPos
//       const obstacleWidth = obstacle.width
//       const obstacleHeight = obstacle.height

//       // Get collision adjustment for this obstacle type
//       const obstacleAdjustment = this.collisionAdjustments.get(obstacle.type) ||
//         { xOffset: 0, yOffset: 0, widthFactor: 0.7, heightFactor: 0.7 }; // Default if type not found

//       // Apply obstacle-specific collision adjustments
//       const adjustedObstacleX = obstaclePos.x + obstacleAdjustment.xOffset;
//       const adjustedObstacleY = obstaclePos.y + obstacleAdjustment.yOffset;
//       const adjustedObstacleWidth = obstacleWidth * obstacleAdjustment.widthFactor;
//       const adjustedObstacleHeight = obstacleHeight * obstacleAdjustment.heightFactor;

//       // Check for collision using rectangle intersection with adjusted hitboxes
//       if (
//         adjustedPlayerX + adjustedPlayerWidth / 2 > adjustedObstacleX - adjustedObstacleWidth / 2 &&
//         adjustedPlayerX - adjustedPlayerWidth / 2 < adjustedObstacleX + adjustedObstacleWidth / 2 &&
//         adjustedPlayerY + adjustedPlayerHeight / 2 > adjustedObstacleY - adjustedObstacleHeight / 2 &&
//         adjustedPlayerY - adjustedPlayerHeight / 2 < adjustedObstacleY + adjustedObstacleHeight / 2
//       ) {
//         if (this.debug) {
//           console.debug(`Collision detected with ${obstacle.type} at (${obstaclePos.x}, ${obstaclePos.y})`);
//         }
//         return obstacle;
//       }
//     }

//     return null;
//   }

//   public setTemporarySpeedBoost(boost: boolean): void {
//     this.temporarySpeedBoost = boost;
//   }

//   public toggleDebug(): void {
//     this.debug = !this.debug;
//     console.debug(`Debug mode: ${this.debug ? 'ON' : 'OFF'}`);
//   }
// }