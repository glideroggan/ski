import p5 from 'p5';
import { Sprite } from './sprite';
import { Player } from './player';

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  sprite: Sprite | null;
  render(p: p5): void;
  update(scrollSpeed: number, horizontalOffset: number): void;
  getType(): string;
  getX(): number;
  getY(): number;
  getWidth(): number;
  getHeight(): number;
}

export class ObstacleManager {
  private p: p5;
  private obstacles: Obstacle[] = [];
  private spriteSheet: p5.Image | null = null;
  private sprites: Map<string, Sprite> = new Map();
  private temporarySpeedBoost: boolean = false;
  private spawnCounter: number = 0;
  private debug: boolean = false; // Set to true to show collision boxes
  
  constructor(p: p5) {
    this.p = p;
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
      
      // Create sprites for each obstacle type
      this.sprites.set('rock', new Sprite(this.p, this.spriteSheet, 0, 0, frameWidth, frameHeight));
      this.sprites.set('tree', new Sprite(this.p, this.spriteSheet, frameWidth, 0, frameWidth, frameHeight));
    } catch (error) {
      console.error("Error setting up obstacle sprites:", error);
    }
  }
  
  public update(scrollSpeed: number, horizontalOffset: number = 0): void {
    // Update existing obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      // Pass both vertical and horizontal movement to the obstacles
      this.obstacles[i].update(
        this.temporarySpeedBoost ? scrollSpeed * 1.5 : scrollSpeed,
        horizontalOffset
      );
      
      // Remove obstacles that are off-screen
      if (this.obstacles[i].getY() < -100 || 
          this.obstacles[i].getX() < -100 || 
          this.obstacles[i].getX() > this.p.width + 100) {
        this.obstacles.splice(i, 1);
      }
    }
    
    // Reset speed boost flag
    this.temporarySpeedBoost = false;
    
    // Spawn new obstacles periodically
    this.spawnCounter += 1;
    if (this.spawnCounter >= 60) { // Spawn every ~1 second (assuming 60 FPS)
      this.spawnObstacle();
      this.spawnCounter = 0;
    }
  }
  
  private spawnObstacle(): void {
    // Ensure we have sprites before creating obstacles
    if (this.sprites.size === 0) {
      return;
    }
    
    const types = ['tree', 'rock'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * this.p.width;
    const y = this.p.height + 50; // Spawn just below the visible area
    
    // Different sizes based on obstacle type
    const width = type === 'tree' ? 60 : 40;
    const height = type === 'tree' ? 80 : 40;
    
    // Get the sprite for this obstacle type
    const sprite = this.sprites.get(type) || null;
    if (!sprite) {
      return; // Skip creating obstacles if the sprite isn't available
    }
    
    const obstacle: Obstacle = {
      x,
      y,
      width,
      height,
      type,
      sprite,
      
      render: function(p: p5): void {
        if (this.sprite) {
          this.sprite.render(this.x, this.y, this.width, this.height);
        }
      },
      
      update: function(scrollSpeed: number, horizontalOffset: number = 0): void {
        this.y -= scrollSpeed; // Move upward (towards the player)
        this.x += horizontalOffset; // Move horizontally based on player direction
      },
      
      getType: function(): string {
        return this.type;
      },
      
      getX: function(): number {
        return this.x;
      },
      
      getY: function(): number {
        return this.y;
      },
      
      getWidth: function(): number {
        return this.width;
      },
      
      getHeight: function(): number {
        return this.height;
      }
    };
    
    this.obstacles.push(obstacle);
  }
  
  public render(): void {
    for (const obstacle of this.obstacles) {
      obstacle.render(this.p);
      
      // If debug mode is enabled, draw the collision boxes
      if (this.debug) {
        this.p.noFill();
        this.p.stroke(255, 0, 0);
        
        // Draw the actual collision box (with margin)
        const collisionMargin = 0.7; // 70% of the actual size
        const width = obstacle.getWidth() * collisionMargin;
        const height = obstacle.getHeight() * collisionMargin;
        
        this.p.rect(
          obstacle.getX() - width/2,
          obstacle.getY() - height/2,
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
  
  public checkCollision(player: Player): Obstacle | null {
    const playerX = player.getX();
    const playerY = player.getY();
    const playerWidth = player.getWidth();
    const playerHeight = player.getHeight();
    
    // Simple box collision detection
    for (const obstacle of this.obstacles) {
      const obstacleX = obstacle.getX();
      const obstacleY = obstacle.getY();
      const obstacleWidth = obstacle.getWidth();
      const obstacleHeight = obstacle.getHeight();
      
      // Tighter collision boxes for gameplay (70% of visual size)
      const collisionMargin = 0.7;
      
      // Calculate the adjusted dimensions
      const adjustedPlayerWidth = playerWidth * collisionMargin;
      const adjustedPlayerHeight = playerHeight * collisionMargin;
      const adjustedObstacleWidth = obstacleWidth * collisionMargin;
      const adjustedObstacleHeight = obstacleHeight * collisionMargin;
      
      // Check for collision using rectangle intersection
      if (
        playerX + adjustedPlayerWidth/2 > obstacleX - adjustedObstacleWidth/2 &&
        playerX - adjustedPlayerWidth/2 < obstacleX + adjustedObstacleWidth/2 &&
        playerY + adjustedPlayerHeight/2 > obstacleY - adjustedObstacleHeight/2 &&
        playerY - adjustedPlayerHeight/2 < obstacleY + adjustedObstacleHeight/2
      ) {
        if (this.debug) {
          console.log(`Collision detected with ${obstacle.getType()} at (${obstacleX}, ${obstacleY})`);
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