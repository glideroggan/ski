import p5 from 'p5';
import { Sprite } from './sprite';
import { Player } from './player/player';
import { Game, RenderableObject } from './game';
import { Position } from './camera';

// Interface for obstacle dimensions
export interface ObstacleDimensions {
  width: number;
  height: number;
}

export interface Obstacle extends RenderableObject {
  worldPos: Position
  width: number;
  height: number;
  type: string;
  sprite: Sprite | null;
  render(p: p5, game: Game): void;  // Add game parameter for coordinate conversion
  update(scrollSpeed: number, horizontalOffset: number): void;
}

// Define collision hitbox offsets for different obstacle types
export interface CollisionOffset {
  xOffset: number;
  yOffset: number;
  widthFactor: number;
  heightFactor: number;
}

export class ObstacleManager {
  private p: p5;
  obstacles: Obstacle[] = [];
  private spriteSheet: p5.Image | null = null;
  private sprites: Map<string, Sprite> = new Map();
  private temporarySpeedBoost: boolean = false;
  private spawnCounter: number = 0;
  private debug: boolean = false; // Set to true to show collision boxes
  private game: Game; // Reference to the game for coordinate conversion
  private types:string[] = ['tree', 'rock', 'snowman'];
  
  // Store dimensions for each obstacle type
  private obstacleDimensions: Map<string, ObstacleDimensions> = new Map([
    ['tree', { width: 60, height: 80 }],
    ['rock', { width: 40, height: 40 }],
    ['snowman', { width: 60, height: 60 }]
  ]);
  
  // Collision hitbox adjustments for each obstacle type
  collisionAdjustments: Map<string, CollisionOffset> = new Map([
    ['tree', { xOffset: 0, yOffset: 30, widthFactor: 0.4, heightFactor: 0.3 }], // Tree collision at bottom part only
    ['rock', { xOffset: 0, yOffset: 0, widthFactor: 0.7, heightFactor: 0.6 }],   // Rocks have more uniform hitbox
    ['snowman', { xOffset: 0, yOffset: 10, widthFactor: 0.5, heightFactor: 0.4 }], 
  ]);
  
  
  constructor(p: p5, game: Game) {
    this.p = p;
    this.game = game;
  }
  
  public setSpriteSheet(spriteSheet: p5.Image): void {
    this.spriteSheet = spriteSheet;
    this.setupSprites();
  }
  
  private setupSprites(): void {
    if (!this.spriteSheet) return;
    
    // Check if image is loaded properly
    if (this.spriteSheet.width === 0 || this.spriteSheet.height === 0) {
      console.error("Obstacle spritesheet has invalid dimensions");
      return;
    }
    
    try {
      // Assuming two obstacle types side by side in the spritesheet
      const numObstacles = 2;
      let frameWidth = this.spriteSheet.width / numObstacles;
      const frameHeight = this.spriteSheet.height / 2;
      
      // Create sprites for each obstacle type with appropriate scaling
      this.sprites.set('rock', new Sprite(this.p, this.spriteSheet, 0, 0, frameWidth, frameHeight, false, 1.0));
      // Make trees bigger with a 1.5x scale factor
      this.sprites.set('tree', new Sprite(this.p, this.spriteSheet, 0, frameHeight, frameWidth, frameHeight, false, 1.7));

      this.sprites.set('snowman', new Sprite(this.p, this.spriteSheet, frameWidth, 0, frameWidth, frameHeight, false, 1));
    } catch (error) {
      console.error("Error setting up obstacle sprites:", error);
    }
  }
  
  public update(game: Game): void {
    // Update existing obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      // Convert world position to screen coordinates for visibility check
      const screenPos = game.camera.worldToScreen(this.obstacles[i].worldPos);
      
      // Remove obstacles that are far off-screen
      if (screenPos.y < -200 || screenPos.x < -200 || screenPos.x > this.p.width + 200) {
        this.obstacles.splice(i, 1);
      }
    }
    
    // Reset speed boost flag
    this.temporarySpeedBoost = false;
    
    // Spawn new obstacles periodically
    this.spawnCounter += 1;
    if (this.spawnCounter >= 60) { // Spawn every ~1 second (assuming 60 FPS)
      this.spawnObstacle(game);
      this.spawnCounter = 0;
    }
  }
  
  private spawnObstacle(game: Game): void {
    // Ensure we have sprites before creating obstacles
    if (this.sprites.size === 0) {
      return;
    }
    
    
    const type = this.types[Math.floor(Math.random() * this.types.length)];
    
    // Calculate a position just below the visible area in world coordinates
    const screenWidth = this.p.width;
    const screenHeight = this.p.height;
    
    // Random X position across the width of the screen
    const screenX = Math.random() * screenWidth;
    // Position below the bottom of the screen
    const screenY = screenHeight + 50;
    
    
    // Get the sprite for this obstacle type
    const sprite = this.sprites.get(type) || null;
    if (!sprite) {
      console.warn(`Sprite for type ${type} not found`);
      return; // Skip creating obstacles if the sprite isn't available
    }
    
    // Get dimensions from the centralized map
    const dimensions = this.obstacleDimensions.get(type) || { width: 40, height: 40 }; // Default if not found
    
    // Apply the sprite's scale factor to the obstacle dimensions
    const width = dimensions.width * sprite.getScale();
    const height = dimensions.height * sprite.getScale();

    // Convert to world coordinates
    const worldPos = game.camera.screenToWorld({x:screenX, y:screenY});
    
    const obstacle: Obstacle = {
      worldPos,
      width,
      height,
      type,
      sprite,
      
      render: function(p: p5, game: Game): void {
        if (this.sprite) {
          // Convert world coordinates to screen coordinates for rendering
          const screenPos = game.camera.worldToScreen(this.worldPos);
          
          // Get the base dimensions for rendering
          const baseDimensions = game.obstacleManager.getObstacleDimensions(this.type);
          this.sprite.render(screenPos.x, screenPos.y, baseDimensions.width, baseDimensions.height);
        }
      },
      
      update: function(scrollSpeed: number, horizontalOffset: number = 0): void {
        // Obstacles don't need to update their position - they're fixed in world space
        // The camera movement creates the illusion of obstacle movement
      },
    };
    
    this.obstacles.push(obstacle);
    
    if (this.debug) {
      console.debug(`Spawned ${type} at world (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
    }
  }
  
  /**
   * Getter for obstacle dimensions
   */
  public getObstacleDimensions(type: string): ObstacleDimensions {
    // Return dimensions for this type, or default if not found
    return this.obstacleDimensions.get(type) || { width: 40, height: 40 };
  }
  
  /**
   * Gets the adjusted collision hitbox for an obstacle
   */
  public getObstacleHitbox(obstacle: Obstacle): { position: Position, width: number, height: number } {
    // Get collision adjustment for this obstacle type
    const adjustment = this.collisionAdjustments.get(obstacle.type) || 
      { xOffset: 0, yOffset: 0, widthFactor: 0.7, heightFactor: 0.7 }; // Default if type not found
    
    // Apply obstacle-specific collision adjustments
    const adjustedPosition: Position = {
      x: obstacle.worldPos.x + adjustment.xOffset,
      y: obstacle.worldPos.y + adjustment.yOffset
    };
    
    const adjustedWidth = obstacle.width * adjustment.widthFactor;
    const adjustedHeight = obstacle.height * adjustment.heightFactor;
    
    return {
      position: adjustedPosition,
      width: adjustedWidth,
      height: adjustedHeight
    };
  }
  
  /**
   * Renders debug hitbox for an obstacle
   */
  public renderObstacleDebugHitbox(obstacle: Obstacle): void {
    if (!this.debug || !this.game) return;
    
    const hitbox = this.getObstacleHitbox(obstacle);
    const screenPos = this.game.camera.worldToScreen(hitbox.position);
    
    // Draw the collision box
    this.p.noFill();
    this.p.stroke(255, 0, 0);
    this.p.rect(
      screenPos.x - hitbox.width / 2,
      screenPos.y - hitbox.height / 2,
      hitbox.width,
      hitbox.height
    );
  }
  
  public render(): void {
    if (!this.game) return;
    
    for (const obstacle of this.obstacles) {
      obstacle.render(this.p, this.game);
      
      // If debug mode is enabled, draw the collision boxes
      this.renderObstacleDebugHitbox(obstacle);
    }
    
    // Show obstacle count in debug mode
    if (this.debug) {
      this.p.fill(255);
      this.p.textSize(12);
      this.p.textAlign(this.p.LEFT, this.p.TOP);
      this.p.text(`Obstacles: ${this.obstacles.length}`, 10, 10);
    }
  }
  
  public checkCollision(playerWorldX: number, playerWorldY: number, player: Player): Obstacle | null {
    // Use player's world coordinates for collision detection
    const playerWidth = player.width;
    const playerHeight = player.height;
    
    // Apply player collision offset for 45-degree perspective
    const adjustedPlayerX = playerWorldX + player.playerCollisionOffset.xOffset;
    const adjustedPlayerY = playerWorldY + player.playerCollisionOffset.yOffset;
    const adjustedPlayerWidth = playerWidth * player.playerCollisionOffset.widthFactor;
    const adjustedPlayerHeight = playerHeight * player.playerCollisionOffset.heightFactor;
    
    // Simple box collision detection with adjusted hitboxes
    for (const obstacle of this.obstacles) {
      const obstaclePos = obstacle.worldPos
      const obstacleWidth = obstacle.width
      const obstacleHeight = obstacle.height
      
      // Get collision adjustment for this obstacle type
      const obstacleAdjustment = this.collisionAdjustments.get(obstacle.type) || 
        { xOffset: 0, yOffset: 0, widthFactor: 0.7, heightFactor: 0.7 }; // Default if type not found
      
      // Apply obstacle-specific collision adjustments
      const adjustedObstacleX = obstaclePos.x + obstacleAdjustment.xOffset;
      const adjustedObstacleY = obstaclePos.y + obstacleAdjustment.yOffset;
      const adjustedObstacleWidth = obstacleWidth * obstacleAdjustment.widthFactor;
      const adjustedObstacleHeight = obstacleHeight * obstacleAdjustment.heightFactor;
      
      // Check for collision using rectangle intersection with adjusted hitboxes
      if (
        adjustedPlayerX + adjustedPlayerWidth/2 > adjustedObstacleX - adjustedObstacleWidth/2 &&
        adjustedPlayerX - adjustedPlayerWidth/2 < adjustedObstacleX + adjustedObstacleWidth/2 &&
        adjustedPlayerY + adjustedPlayerHeight/2 > adjustedObstacleY - adjustedObstacleHeight/2 &&
        adjustedPlayerY - adjustedPlayerHeight/2 < adjustedObstacleY + adjustedObstacleHeight/2
      ) {
        if (this.debug) {
          console.debug(`Collision detected with ${obstacle.type} at (${obstaclePos.x}, ${obstaclePos.y})`);
        }
        return obstacle;
      }
    }
    
    return null;
  }
  
  public setTemporarySpeedBoost(boost: boolean): void {
    this.temporarySpeedBoost = boost;
  }
  
  public toggleDebug(): void {
    this.debug = !this.debug;
    console.debug(`Debug mode: ${this.debug ? 'ON' : 'OFF'}`);
  }
}