import p5 from 'p5';
import { Sprite } from './sprite';
import { Player } from './player';
import { Game } from './game';
import { Position } from './camera';

export interface Obstacle {
  worldPos:Position
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
  
  // Collision hitbox adjustments for each obstacle type
  private collisionAdjustments: Map<string, CollisionOffset> = new Map([
    ['tree', { xOffset: 0, yOffset: 30, widthFactor: 0.4, heightFactor: 0.3 }], // Tree collision at bottom part only
    ['rock', { xOffset: 0, yOffset: 0, widthFactor: 0.7, heightFactor: 0.6 }],   // Rocks have more uniform hitbox
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
      const frameWidth = this.spriteSheet.width / numObstacles;
      const frameHeight = this.spriteSheet.height;
      
      // Create sprites for each obstacle type with appropriate scaling
      this.sprites.set('rock', new Sprite(this.p, this.spriteSheet, 0, 0, frameWidth, frameHeight, false, 1.0));
      // Make trees bigger with a 1.5x scale factor
      this.sprites.set('tree', new Sprite(this.p, this.spriteSheet, frameWidth, 0, frameWidth, frameHeight, false, 1.5));
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
    
    const types = ['tree', 'rock'];
    const type = types[Math.floor(Math.random() * types.length)];
    
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
      return; // Skip creating obstacles if the sprite isn't available
    }
    
    // Different sizes based on obstacle type
    const baseWidth = type === 'tree' ? 60 : 40;
    const baseHeight = type === 'tree' ? 80 : 40;
    
    // Apply the sprite's scale factor to the obstacle dimensions
    const width = baseWidth * sprite.getScale();
    const height = baseHeight * sprite.getScale();

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
          this.sprite.render(screenPos.x, screenPos.y, baseWidth, baseHeight);
        }
      },
      
      update: function(scrollSpeed: number, horizontalOffset: number = 0): void {
        // Obstacles don't need to update their position - they're fixed in world space
        // The camera movement creates the illusion of obstacle movement
      },
    };
    
    this.obstacles.push(obstacle);
    
    if (this.debug) {
      console.log(`Spawned ${type} at world (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
    }
  }
  
  public render(): void {
    if (!this.game) return;
    
    for (const obstacle of this.obstacles) {
      obstacle.render(this.p, this.game);
      
      // If debug mode is enabled, draw the collision boxes
      if (this.debug) {
        this.p.noFill();
        this.p.stroke(255, 0, 0);
        
        // Get collision adjustment for this obstacle type
        const obstacleAdjustment = this.collisionAdjustments.get(obstacle.type) || 
          { xOffset: 0, yOffset: 0, widthFactor: 0.7, heightFactor: 0.7 };
        
        // Calculate the collision box dimensions
        const width = obstacle.width * obstacleAdjustment.widthFactor;
        const height = obstacle.height * obstacleAdjustment.heightFactor;
        
        const adjustedPositionForCollisionBox = {
          x: obstacle.worldPos.x + obstacleAdjustment.xOffset,
          y: obstacle.worldPos.y + obstacleAdjustment.yOffset,
        };

        // Convert to screen coordinates
        const screenPos = this.game.camera.worldToScreen(adjustedPositionForCollisionBox);
        
        // Draw the collision box
        this.p.rect(
          screenPos.x - width/2,
          screenPos.y - height/2,
          width,
          height
        );
      }
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
          console.log(`Collision detected with ${obstacle.type} at (${obstaclePos.x}, ${obstaclePos.y})`);
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
    console.log(`Debug mode: ${this.debug ? 'ON' : 'OFF'}`);
  }
}