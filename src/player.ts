import p5 from 'p5';
import { Sprite } from './sprite';

export enum PlayerState {
  DOWN,
  RIGHT_DOWN,
  RIGHT,
  LEFT_DOWN,
  LEFT
}

export class Player {
  private p: p5;
  private x: number;
  private y: number;
  private width: number = 50;
  private height: number = 80;
  private maxPlayerMovement: number = 3;
  private spriteSheet: p5.Image | null = null;
  private sprites: Map<PlayerState, Sprite> = new Map();
  private currentState: PlayerState = PlayerState.DOWN;
  private assetsLoaded: boolean = false;
  private stateTransitionTimer: number = 0;
  private stateTransitionDelay: number = 10; // Frames to wait before allowing another state change
  private collisionEffect: number = 0; // For visual collision feedback
  private debug: boolean = false; // Debug mode
  
  constructor(p: p5, x: number, y: number) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.loadAssets();
  }

  private loadAssets(): void {
    this.p.loadImage('assets/player.png', 
      (img: p5.Image) => {
        this.spriteSheet = img;
        console.log("Player spritesheet loaded. Dimensions:", img.width, "x", img.height);
        this.setupSprites();
        this.assetsLoaded = true;
      },
      (err) => {
        console.error('Failed to load player.png:', err);
      }
    );
  }

  private setupSprites(): void {
    if (!this.spriteSheet || this.spriteSheet.width === 0 || this.spriteSheet.height === 0) {
      console.error("Cannot setup player sprites: spritesheet is invalid");
      return;
    }
    
    try {
      // Check if the spritesheet is a single row of sprites or multiple rows
      let frameWidth, frameHeight;
      let isMultiRow = false;
      
      // If width/height ratio seems more like a grid than a strip
      if (this.spriteSheet.width / this.spriteSheet.height < 2) {
        // This suggests we have a grid of sprites (2x2 or similar)
        isMultiRow = true;
        frameWidth = this.spriteSheet.width / 2;
        frameHeight = this.spriteSheet.height / 2;
      } else {
        // This suggests we have a horizontal strip of sprites
        frameWidth = this.spriteSheet.width / 3;
        frameHeight = this.spriteSheet.height;
      }
      
      if (isMultiRow) {
        // Multi-row layout (2x2 grid)
        this.sprites.set(PlayerState.DOWN, 
          new Sprite(this.p, this.spriteSheet, 0, 0, frameWidth, frameHeight));
        
        this.sprites.set(PlayerState.RIGHT_DOWN, 
          new Sprite(this.p, this.spriteSheet, frameWidth, 0, frameWidth, frameHeight));
        
        this.sprites.set(PlayerState.RIGHT, 
          new Sprite(this.p, this.spriteSheet, 0, frameHeight, frameWidth, frameHeight));
        
        // Create mirrored sprites for left movement
        this.sprites.set(PlayerState.LEFT_DOWN, 
          new Sprite(this.p, this.spriteSheet, frameWidth, 0, frameWidth, frameHeight, true));
        
        this.sprites.set(PlayerState.LEFT, 
          new Sprite(this.p, this.spriteSheet, 0, frameHeight, frameWidth, frameHeight, true));
      } else {
        // Single-row layout (3 sprites in a row)
        this.sprites.set(PlayerState.DOWN, 
          new Sprite(this.p, this.spriteSheet, 0, 0, frameWidth, frameHeight));
        
        this.sprites.set(PlayerState.RIGHT_DOWN, 
          new Sprite(this.p, this.spriteSheet, frameWidth, 0, frameWidth, frameHeight));
        
        this.sprites.set(PlayerState.RIGHT, 
          new Sprite(this.p, this.spriteSheet, frameWidth * 2, 0, frameWidth, frameHeight));
        
        // Create mirrored sprites for left movement
        this.sprites.set(PlayerState.LEFT_DOWN, 
          new Sprite(this.p, this.spriteSheet, frameWidth, 0, frameWidth, frameHeight, true));
        
        this.sprites.set(PlayerState.LEFT, 
          new Sprite(this.p, this.spriteSheet, frameWidth * 2, 0, frameWidth, frameHeight, true));
      }
    } catch (error) {
      console.error("Error setting up player sprites:", error);
    }
  }
  
  public update(): void {
    // Keep player within screen bounds
    this.x = this.p.constrain(this.x, this.width / 2, this.p.width - this.width / 2);
    
    // Update state transition timer
    if (this.stateTransitionTimer > 0) {
      this.stateTransitionTimer--;
    }
    
    // Update collision effect
    if (this.collisionEffect > 0) {
      this.collisionEffect--;
    }
  }
  
  public render(): void {
    if (!this.assetsLoaded || !this.spriteSheet || this.sprites.size === 0) {
      // Don't render anything if assets aren't loaded
      return;
    }
    
    const sprite = this.sprites.get(this.currentState);
    if (!sprite) {
      // Skip rendering if sprite isn't available
      return;
    }
    
    // Apply visual effect if collision is active
    if (this.collisionEffect > 0) {
      this.p.push();
      if (this.collisionEffect % 4 < 2) { // Flashing effect
        this.p.tint(255, 100, 100); // Red tint
      }
      // Add slight random offset for shake effect
      const shakeAmount = this.collisionEffect / 5;
      this.p.translate(
        this.p.random(-shakeAmount, shakeAmount),
        this.p.random(-shakeAmount, shakeAmount)
      );
    }
    
    sprite.render(this.x, this.y, this.width, this.height);
    
    if (this.collisionEffect > 0) {
      this.p.pop(); // Restore drawing state
    }
    
    // Debug collision box
    if (this.debug) {
      this.p.noFill();
      this.p.stroke(0, 255, 0);
      const collisionMargin = 0.7; // Match the collision detection margin
      const adjustedWidth = this.width * collisionMargin;
      const adjustedHeight = this.height * collisionMargin;
      this.p.rect(
        this.x - adjustedWidth/2,
        this.y - adjustedHeight/2,
        adjustedWidth,
        adjustedHeight
      );
    }
  }
  
  public turnRight(): boolean {
    // Only allow state transition if the timer is at 0
    if (this.stateTransitionTimer > 0) {
      return false;
    }
    
    // Progressive state transition when turning right
    switch (this.currentState) {
      case PlayerState.LEFT:
        this.currentState = PlayerState.LEFT_DOWN;
        break;
      case PlayerState.LEFT_DOWN:
        this.currentState = PlayerState.DOWN;
        break;
      case PlayerState.DOWN:
        this.currentState = PlayerState.RIGHT_DOWN;
        break;
      case PlayerState.RIGHT_DOWN:
        this.currentState = PlayerState.RIGHT;
        break;
      case PlayerState.RIGHT:
        // Already at maximum right turn
        return false;
    }
    
    // Set timer to prevent rapid state changes
    this.stateTransitionTimer = this.stateTransitionDelay;
    return true;
  }
  
  public turnLeft(): boolean {
    // Only allow state transition if the timer is at 0
    if (this.stateTransitionTimer > 0) {
      return false;
    }
    
    // Progressive state transition when turning left
    switch (this.currentState) {
      case PlayerState.RIGHT:
        this.currentState = PlayerState.RIGHT_DOWN;
        break;
      case PlayerState.RIGHT_DOWN:
        this.currentState = PlayerState.DOWN;
        break;
      case PlayerState.DOWN:
        this.currentState = PlayerState.LEFT_DOWN;
        break;
      case PlayerState.LEFT_DOWN:
        this.currentState = PlayerState.LEFT;
        break;
      case PlayerState.LEFT:
        // Already at maximum left turn
        return false;
    }
    
    // Set timer to prevent rapid state changes
    this.stateTransitionTimer = this.stateTransitionDelay;
    return true;
  }
  
  public getCurrentState(): PlayerState {
    return this.currentState;
  }
  
  public handleCollision(obstacle: any): void {
    // Set collision effect for visual feedback (lasts 30 frames)
    this.collisionEffect = 30;
    
    console.log('Player collided with obstacle:', obstacle.getType());
    
    // Different effects based on obstacle type
    switch(obstacle.getType()) {
      case 'tree':
        // Trees cause a significant slowdown
        this.collisionEffect = 45; // Longer effect
        break;
      case 'rock':
        // Rocks cause a medium slowdown
        this.collisionEffect = 30;
        break;
      default:
        this.collisionEffect = 20;
    }
  }
  
  public isInCollisionState(): boolean {
    return this.collisionEffect > 0;
  }
  
  public toggleDebug(): void {
    this.debug = !this.debug;
  }
  
  // For collision detection
  public getX(): number {
    return this.x;
  }
  
  public getY(): number {
    return this.y;
  }
  
  public getWidth(): number {
    return this.width;
  }
  
  public getHeight(): number {
    return this.height;
  }
}