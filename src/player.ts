import p5 from 'p5';
import { Sprite } from './sprite';
import { CollisionOffset, Obstacle, ObstacleManager } from './obstacleManager';
import { Game } from './game';
import { Position } from './camera';

export enum PlayerState {
  DOWN,
  RIGHT_DOWN,
  RIGHT,
  LEFT_DOWN,
  LEFT,
  FLYING_DOWN,
  FLYING_RIGHT_DOWN,
  FLYING_RIGHT,
  FLYING_LEFT_DOWN,
  FLYING_LEFT,
  CRASHED
}

export class Player {
  private p: p5;
  width: number = 50;
  height: number = 80;

  private maxPlayerMovement: number = 3;
  private spriteSheet: p5.Image | null = null;
  private sprites: Map<PlayerState, Sprite> = new Map();
  private currentState: PlayerState = PlayerState.DOWN;
  private assetsLoaded: boolean = false;
  private stateTransitionTimer: number = 0;
  private stateTransitionDelay: number = 10; // Frames to wait before allowing another state change
  private collisionEffect: number = 0; // For visual collision feedback
  private debug: boolean = false; // Debug mode
  game: Game;
  worldPos: Position;

  private collisionCount: number = 0;
  private flyingTimer: number = 0;
  private readonly flyingDuration: number = 60; // Flying state lasts for 60 frames (1 second at 60fps)
  private crashRecoveryTimer: number = 0;
  private readonly crashRecoveryDuration: number = 180; // 3 seconds to recover from crash

  constructor(p: p5, pos: Position, game: Game) {
    this.p = p;
    this.game = game;
    this.worldPos = pos;
    this.loadAssets();
  }

  // Player collision adjustment for 45-degree perspective
  playerCollisionOffset: CollisionOffset = {
    xOffset: 0,
    yOffset: 20,
    widthFactor: 0.6,
    heightFactor: 0.15, // Focus on upper part of player for collision
  };

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
      // Assuming the spritesheet is a 2x2 grid
      const frameWidth = this.spriteSheet.width / 4;
      const frameHeight = this.spriteSheet.height / 2;

      // Map frames to player states
      this.sprites.set(PlayerState.DOWN,
        new Sprite(this.p, this.spriteSheet, 0, frameHeight, frameWidth, frameHeight));

      this.sprites.set(PlayerState.RIGHT_DOWN,
        new Sprite(this.p, this.spriteSheet, frameWidth, frameHeight, frameWidth, frameHeight));

      this.sprites.set(PlayerState.RIGHT,
        new Sprite(this.p, this.spriteSheet, frameWidth * 2, frameHeight, frameWidth, frameHeight));

      this.sprites.set(PlayerState.LEFT_DOWN,
        new Sprite(this.p, this.spriteSheet, frameWidth, frameHeight, frameWidth, frameHeight, true));

      this.sprites.set(PlayerState.LEFT,
        new Sprite(this.p, this.spriteSheet, frameWidth * 2, frameHeight, frameWidth, frameHeight, true));

      // Flying states use the same sprite with slight rotation
      this.sprites.set(PlayerState.FLYING_DOWN,
        new Sprite(this.p, this.spriteSheet, frameWidth * 3, 0, frameWidth, frameHeight));
        
      this.sprites.set(PlayerState.FLYING_RIGHT_DOWN,
        new Sprite(this.p, this.spriteSheet, frameWidth * 3, 0, frameWidth, frameHeight));
        
      this.sprites.set(PlayerState.FLYING_RIGHT,
        new Sprite(this.p, this.spriteSheet, frameWidth * 3, 0, frameWidth, frameHeight));
        
      this.sprites.set(PlayerState.FLYING_LEFT_DOWN,
        new Sprite(this.p, this.spriteSheet, frameWidth * 3, 0, frameWidth, frameHeight, true));
        
      this.sprites.set(PlayerState.FLYING_LEFT,
        new Sprite(this.p, this.spriteSheet, frameWidth * 3, 0, frameWidth, frameHeight, true));

      // Crashed state
      this.sprites.set(PlayerState.CRASHED,
        new Sprite(this.p, this.spriteSheet, 0, 0, frameWidth, frameHeight));

    } catch (error) {
      console.error("Error setting up player sprites:", error);
    }
  }

  public update(): void {
    // Update flying timer
    if (this.isFlying() && this.flyingTimer > 0) {
      this.flyingTimer--;
      
      // When flying timer ends, transition to crashed state
      if (this.flyingTimer === 0) {
        this.transitionToCrashed();
      }
    }
    
    // Update crash recovery timer
    if (this.isCrashed() && this.crashRecoveryTimer > 0) {
      this.crashRecoveryTimer--;
      
      // When recovery timer ends, reset to regular state
      if (this.crashRecoveryTimer === 0) {
        this.resetAfterCrash();
      }
    }

    // Only perform movement if not crashed
    if (!this.isCrashed()) {
      // Calculate movement speed (faster when flying)
      const speedMultiplier = this.isFlying() ? 2.0 : 1.0;
      const baseSpeed = this.maxPlayerMovement * speedMultiplier;
      
      // Move based on current state
      switch (this.currentState) {
        case PlayerState.LEFT:
        case PlayerState.FLYING_LEFT:
          this.worldPos.x -= baseSpeed;
          this.worldPos.y += 1;
          break;
        case PlayerState.RIGHT:
        case PlayerState.FLYING_RIGHT:
          this.worldPos.x += baseSpeed;
          this.worldPos.y += 1;
          break;
        case PlayerState.LEFT_DOWN:
        case PlayerState.FLYING_LEFT_DOWN:
          this.worldPos.x -= baseSpeed / 2;
          this.worldPos.y += 1;
          this.worldPos.y += baseSpeed / 2;
          break;
        case PlayerState.RIGHT_DOWN:
        case PlayerState.FLYING_RIGHT_DOWN:
          this.worldPos.x += baseSpeed / 2;
          this.worldPos.y += 1;
          this.worldPos.y += baseSpeed / 2;
          break;
        case PlayerState.DOWN:
        case PlayerState.FLYING_DOWN:
          // No horizontal movement when going straight down
          this.worldPos.y += 1;
          this.worldPos.y += baseSpeed;
          break;
        case PlayerState.CRASHED:
          // No movement when crashed
          break;
      }
    }

    // Update state transition timer
    if (this.stateTransitionTimer > 0) {
      this.stateTransitionTimer--;
    }

    // Update collision effect
    if (this.collisionEffect > 0) {
      this.collisionEffect--;
    }
  }

  /**
   * Returns the adjusted collision hitbox for the player
   */
  public getCollisionHitbox(): { position: Position, width: number, height: number } {
    // Apply collision offset for better collision detection
    const adjustedPosition: Position = {
      x: this.worldPos.x + this.playerCollisionOffset.xOffset,
      y: this.worldPos.y + this.playerCollisionOffset.yOffset
    };

    const adjustedWidth = this.width * this.playerCollisionOffset.widthFactor;
    const adjustedHeight = this.height * this.playerCollisionOffset.heightFactor;

    return {
      position: adjustedPosition,
      width: adjustedWidth,
      height: adjustedHeight
    };
  }

  /**
   * Renders the debug hitbox for the player
   */
  public renderDebugHitbox(): void {
    if (!this.debug) return;

    const hitbox = this.getCollisionHitbox();
    const screenPos = this.game.camera.worldToScreen(hitbox.position);

    // Draw player position indicator
    this.p.noFill();
    this.p.stroke(0, 255, 0);
    this.p.circle(screenPos.x, screenPos.y, 10);

    // Draw hitbox
    this.p.stroke(255, 0, 0);
    this.p.rect(
      screenPos.x - hitbox.width / 2,
      screenPos.y - hitbox.height / 2,
      hitbox.width,
      hitbox.height
    );
  }

  public render(): void {
    console.debug('Player position:', this.worldPos.x, this.worldPos.y);
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

    // Get screen position from world position using camera transformation
    const screenPos = this.game.camera.worldToScreen(this.worldPos);

    // Center the sprite on the player's position
    const x = screenPos.x;
    const y = screenPos.y;

    sprite.render(x, y, this.width, this.height);

    if (this.collisionEffect > 0) {
      this.p.pop(); // Restore drawing state
    }

    // Render debug hitbox if debug mode is enabled
    this.renderDebugHitbox();
  }

  public turnRight(): boolean {
    // Prevent turning if crashed or flying
    if (this.isCrashed() || this.isFlying() || this.stateTransitionTimer > 0) {
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
    // Prevent turning if crashed or flying
    if (this.isCrashed() || this.isFlying() || this.stateTransitionTimer > 0) {
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

  public handleCollision(obstacle: Obstacle): void {
    // Set collision effect for visual feedback
    this.collisionEffect = 30;
    
    console.log('Player collided with obstacle:', obstacle.type);
    
    // Increment collision count
    this.collisionCount++;
    console.log(`Collision count: ${this.collisionCount}`);
    
    // Different effects based on collision count and obstacle type
    if (this.collisionCount >= 4) {
      // On fourth collision, transition to flying state
      this.transitionToFlyingState();
    } else {
      // Different effects based on obstacle type
      switch (obstacle.type) {
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
  }

  /**
   * Transitions the player to the appropriate flying state based on current direction
   */
  private transitionToFlyingState(): void {
    // Map regular states to flying states
    switch (this.currentState) {
      case PlayerState.DOWN:
        this.currentState = PlayerState.FLYING_DOWN;
        break;
      case PlayerState.RIGHT_DOWN:
        this.currentState = PlayerState.FLYING_RIGHT_DOWN;
        break;
      case PlayerState.RIGHT:
        this.currentState = PlayerState.FLYING_RIGHT;
        break;
      case PlayerState.LEFT_DOWN:
        this.currentState = PlayerState.FLYING_LEFT_DOWN;
        break;
      case PlayerState.LEFT:
        this.currentState = PlayerState.FLYING_LEFT;
        break;
      default:
        // If already in a flying or crashed state, do nothing
        return;
    }
    
    // Set flying timer
    this.flyingTimer = this.flyingDuration;
    
    // Apply special flying effect
    this.collisionEffect = this.flyingDuration;
    
    console.log(`Player is now flying! Current state: ${PlayerState[this.currentState]}`);
  }
  
  /**
   * Transitions the player to crashed state
   */
  private transitionToCrashed(): void {
    this.currentState = PlayerState.CRASHED;
    this.crashRecoveryTimer = this.crashRecoveryDuration;
    console.log("Player has crashed!");
  }
  
  /**
   * Resets player after a crash
   */
  private resetAfterCrash(): void {
    this.currentState = PlayerState.DOWN;
    this.collisionCount = 0;
    console.log("Player recovered from crash");
  }
  
  /**
   * Checks if player is in a flying state
   */
  public isFlying(): boolean {
    return this.currentState === PlayerState.FLYING_DOWN ||
           this.currentState === PlayerState.FLYING_RIGHT_DOWN ||
           this.currentState === PlayerState.FLYING_RIGHT ||
           this.currentState === PlayerState.FLYING_LEFT_DOWN ||
           this.currentState === PlayerState.FLYING_LEFT;
  }
  
  /**
   * Checks if player is in crashed state
   */
  public isCrashed(): boolean {
    return this.currentState === PlayerState.CRASHED;
  }
  
  public isInCollisionState(): boolean {
    return this.collisionEffect > 0 || this.isFlying() || this.isCrashed();
  }

  public toggleDebug(): void {
    this.debug = !this.debug;
  }
}