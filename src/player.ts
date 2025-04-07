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

  private maxPlayerMovement: number = 4;
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

  // Heightmap adjustment properties
  terrainHeightFactor: number = 45; // How much to adjust player height based on terrain (reduced from 20)
  private terrainRotationFactor: number = 0.02; // Reduced rotation factor for more subtle effect
  private useTerrainHeight: boolean = true; // Toggle for terrain height adjustment
  private useTerrainRotation: boolean = true; // Toggle for terrain rotation adjustment

  // For smoother visual transitions - reduced smoothing for more responsive movement
  currentVisualHeight: number = 0;
  private currentRotation: number = 0;
  private heightSmoothingFactor: number = 0.15; // Reduced from 0.2 for more responsive movement

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
          this.worldPos.y += baseSpeed / 4;
          break;
        case PlayerState.RIGHT:
        case PlayerState.FLYING_RIGHT:
          this.worldPos.x += baseSpeed;
          this.worldPos.y += baseSpeed / 4;
          break;
        case PlayerState.LEFT_DOWN:
        case PlayerState.FLYING_LEFT_DOWN:
          this.worldPos.x -= baseSpeed / 2;
          this.worldPos.y += baseSpeed * 0.8;
          break;
        case PlayerState.RIGHT_DOWN:
        case PlayerState.FLYING_RIGHT_DOWN:
          this.worldPos.x += baseSpeed / 2;
          this.worldPos.y += baseSpeed * 0.8;
          break;
        case PlayerState.DOWN:
        case PlayerState.FLYING_DOWN:
          // No horizontal movement when going straight down
          this.worldPos.y += baseSpeed;
          break;
        case PlayerState.CRASHED:
          // No movement when crashed
          break;
      }


    }

    if (this.currentState !== PlayerState.CRASHED && !this.isFlying()) {
      const skiOffset = 30
      const adjustedHeightPos = this.worldPos.y - this.currentVisualHeight + skiOffset;
      this.game.skiTrack.addPoint(this.worldPos.x, adjustedHeightPos);
    }

    // Update state transition timer
    if (this.stateTransitionTimer > 0) {
      this.stateTransitionTimer--;
    }

    // Update collision effect
    if (this.collisionEffect > 0) {
      this.collisionEffect--;
    }

    // Pre-calculate terrain height for smoother transitions
    if (this.useTerrainHeight && this.game.world) {
      const terrainHeight = this.game.world.getHeightAtPosition(this.worldPos);
      // Gradually adjust current visual height toward target terrain height
      this.currentVisualHeight = this.currentVisualHeight * (1 - this.heightSmoothingFactor) +
        (terrainHeight * this.terrainHeightFactor) * this.heightSmoothingFactor;
    }

    // Pre-calculate terrain rotation for smoother transitions
    if (this.useTerrainRotation && !this.isFlying() && !this.isCrashed() && this.game.world) {
      const slope = this.game.world.getSlopeAtPosition(this.worldPos);
      // Gradually adjust current rotation toward target slope angle
      const targetRotation = slope.angle * this.terrainRotationFactor;
      this.currentRotation = this.currentRotation * (1 - this.heightSmoothingFactor) +
        targetRotation * this.heightSmoothingFactor;
    } else {
      // Gradually reset rotation to zero when not using terrain rotation
      this.currentRotation = this.currentRotation * (1 - this.heightSmoothingFactor);
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

    // If terrain height is enabled, adjust the collision hitbox Y position
    if (this.useTerrainHeight) {
      // Apply the same height adjustment that's used for visual rendering
      adjustedPosition.y -= this.currentVisualHeight;
    }

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
    let x = screenPos.x;
    let y = screenPos.y;

    // Apply terrain height adjustment using pre-calculated smooth height
    if (this.useTerrainHeight) {
      y -= this.currentVisualHeight;
    }

    this.p.push(); // Save current transformation state

    // Apply terrain-based rotation using pre-calculated smooth rotation
    if (this.useTerrainRotation && !this.isFlying() && !this.isCrashed()) {
      // Apply rotation based on pre-calculated smooth rotation
      // Translate to player position, rotate, then translate back
      this.p.translate(x, y);
      this.p.rotate(this.currentRotation);
      this.p.translate(-x, -y);
    }

    // Render the sprite
    sprite.render(x, y, this.width, this.height);

    this.p.pop(); // Restore transformation state

    if (this.collisionEffect > 0) {
      this.p.pop(); // Restore drawing state (for collision effect)
    }

    // Render debug hitbox if debug mode is enabled
    this.renderDebugHitbox();

    // Debug visualization for terrain height adjustment
    if (this.debug) {
      const terrainHeight = this.game.world.getHeightAtPosition(this.worldPos);
      const slope = this.game.world.getSlopeAtPosition(this.worldPos);

      // Draw a line showing the height adjustment
      this.p.stroke(0, 255, 0);
      this.p.line(x, y, x, screenPos.y);

      // Draw a line showing slope direction
      this.p.stroke(255, 0, 0);
      const slopeLength = 20;
      this.p.line(
        x,
        y,
        x + Math.cos(this.currentRotation / this.terrainRotationFactor) * slopeLength,
        y + Math.sin(this.currentRotation / this.terrainRotationFactor) * slopeLength
      );

      // Display smoothed height value
      this.p.fill(255, 255, 0);
      this.p.noStroke();
      this.p.text(`Visual Height: ${this.currentVisualHeight.toFixed(2)}`, 10, 210);
      this.p.text(`Visual Rotation: ${(this.currentRotation * 180 / Math.PI).toFixed(2)}°`, 10, 230);
    }
  }

  // Toggle terrain height adjustment
  public toggleTerrainHeight(): void {
    this.useTerrainHeight = !this.useTerrainHeight;
    console.log(`Terrain height adjustment: ${this.useTerrainHeight ? 'ON' : 'OFF'}`);
  }

  // Toggle terrain rotation adjustment
  public toggleTerrainRotation(): void {
    this.useTerrainRotation = !this.useTerrainRotation;
    console.log(`Terrain rotation adjustment: ${this.useTerrainRotation ? 'ON' : 'OFF'}`);
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