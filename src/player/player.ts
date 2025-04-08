import p5 from 'p5';
import { Sprite } from '../sprite';
import { SpriteAtlas } from '../spriteAtlas';
import { CollisionOffset, Obstacle, ObstacleManager } from '../obstacleManager';
import { Game, RenderableObject } from '../game';
import { Position } from '../camera';
import { PlayerRenderer } from './player.rendering';

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

// Interface for data needed by PlayerRenderer
export interface PlayerRenderData {
  p: p5;
  assetsLoaded: boolean;
  spriteSheet: p5.Image | null;
  sprites: Map<PlayerState, Sprite>;
  currentState: PlayerState;
  game: Game;
  worldPos: Position;
  width: number;
  height: number;
  useTerrainHeight: boolean;
  currentVisualHeight: number;
  useTerrainRotation: boolean;
  currentRotation: number;
  terrainRotationFactor: number;
  collisionEffect: number;
  debug: boolean;
  isFlying(): boolean;
  isCrashed(): boolean;
  getCollisionHitbox(): { position: Position, width: number, height: number };
}

export class Player implements RenderableObject {
  protected p: p5;
  width: number = 50;
  height: number = 80;

  private maxPlayerMovement: number = 4;
  protected spriteSheet: p5.Image | null = null;
  protected sprites: Map<PlayerState, Sprite> = new Map();
  protected spriteAtlas: SpriteAtlas | null = null;
  protected currentState: PlayerState = PlayerState.DOWN;
  protected assetsLoaded: boolean = false;
  private stateTransitionTimer: number = 0;
  private stateTransitionDelay: number = 10; // Frames to wait before allowing another state change
  protected collisionEffect: number = 0; // For visual collision feedback
  protected debug: boolean = false; // Debug mode
  game: Game;
  worldPos: Position;

  // Heightmap adjustment properties
  terrainHeightFactor: number = 45; // How much to adjust player height based on terrain (reduced from 20)
  protected terrainRotationFactor: number = 0.02; // Reduced rotation factor for more subtle effect
  protected useTerrainHeight: boolean = true; // Toggle for terrain height adjustment
  protected useTerrainRotation: boolean = true; // Toggle for terrain rotation adjustment

  // For smoother visual transitions - reduced smoothing for more responsive movement
  protected currentVisualHeight: number = 0;
  protected currentRotation: number = 0;
  private heightSmoothingFactor: number = 0.15; // Reduced from 0.2 for more responsive movement

  private collisionCount: number = 0;
  private flyingTimer: number = 0;
  private readonly flyingDuration: number = 60; // Flying state lasts for 60 frames (1 second at 60fps)
  private crashRecoveryTimer: number = 0;
  private readonly crashRecoveryDuration: number = 180; // 3 seconds to recover from crash
  
  // Add a reference to the renderer
  private renderer: PlayerRenderer;

  constructor(p: p5, pos: Position, game: Game) {
    this.p = p;
    this.game = game;
    this.worldPos = pos;
    this.renderer = new PlayerRenderer(this.getRenderData());
    this.loadAssets();
  }

  // Player collision adjustment for 45-degree perspective
  playerCollisionOffset: CollisionOffset = {
    xOffset: 0,
    yOffset: 20,
    widthFactor: 0.6,
    heightFactor: 0.15, // Focus on upper part of player for collision
  };

  // Provide all render data through a single method
  public getRenderData(): PlayerRenderData {
    return {
      p: this.p,
      assetsLoaded: this.assetsLoaded,
      spriteSheet: this.spriteSheet,
      sprites: this.sprites,
      currentState: this.currentState,
      game: this.game,
      worldPos: this.worldPos,
      width: this.width,
      height: this.height,
      useTerrainHeight: this.useTerrainHeight,
      currentVisualHeight: this.currentVisualHeight,
      useTerrainRotation: this.useTerrainRotation,
      currentRotation: this.currentRotation,
      terrainRotationFactor: this.terrainRotationFactor,
      collisionEffect: this.collisionEffect,
      debug: this.debug,
      isFlying: () => this.isFlying(),
      isCrashed: () => this.isCrashed(),
      getCollisionHitbox: () => this.getCollisionHitbox()
    };
  }

  private loadAssets(): void {
    // Create sprite atlas
    this.spriteAtlas = new SpriteAtlas(this.p);
    
    // Load the TexturePacker atlas
    this.spriteAtlas.loadAtlas('assets/player.json', 'assets/player.png')
      .then(() => {
        console.debug("Player sprite atlas loaded successfully");
        this.setupSpritesFromAtlas();
        this.assetsLoaded = true;
        this.renderer.updateRenderData(this.getRenderData()); // Update renderer with loaded assets
      })
      .catch(err => {
        console.error("Failed to load player sprite atlas:", err);
        // Fallback to manual sprite loading
        // this.loadSpriteSheetManually();
      });
  }
  

  // private loadSpriteSheetManually(): void {
  //   console.debug("Falling back to manual spritesheet loading");
  //   this.p.loadImage('assets/player.png',
  //     (img: p5.Image) => {
  //       this.spriteSheet = img;
  //       console.debug("Player spritesheet loaded manually. Dimensions:", img.width, "x", img.height);
  //       this.setupSprites();
  //       this.assetsLoaded = true;
  //     },
  //     (err) => {
  //       console.error('Failed to load player.png:', err);
  //     }
  //   );
  // }

  private setupSpritesFromAtlas(): void {
    if (!this.spriteAtlas || !this.spriteAtlas.isLoaded()) {
      console.error("Cannot setup sprites: sprite atlas is not loaded");
      return;
    }
    
    try {
      // Map TexturePacker frame names to player states
      // We're mapping both with and without .png extension for flexibility
      const spriteStateMapping = [
        { state: PlayerState.CRASHED, name: "crash" },

        { state: PlayerState.DOWN, name: "skiier down" },
        { state: PlayerState.RIGHT_DOWN, name: "skiier right down" },
        { state: PlayerState.RIGHT, name: "skiier right" },
        // Use the same sprites for left states but with flip=true
        { state: PlayerState.LEFT_DOWN, name: "skiier right down", flip: true },
        { state: PlayerState.LEFT, name: "skiier right", flip: true },
        // Alternative frames for animation
        // NOTE: don't enable these yet, as I think we need separate states, and should supply the name of the skiier we want to use
        // so that we can have multiple skiier types
        // { state: PlayerState.DOWN, name: "skiier2 down" },
        // { state: PlayerState.RIGHT_DOWN, name: "skiier2 right down" },
        // { state: PlayerState.RIGHT, name: "skiier2 right" },
        // { state: PlayerState.LEFT_DOWN, name: "skiier2 right down", flip: true },
        // { state: PlayerState.LEFT, name: "skiier2 right", flip: true },
        // Flying states
        { state: PlayerState.FLYING_DOWN, name: "down crash 1" },
        { state: PlayerState.FLYING_RIGHT_DOWN, name: "right down crash 1" },
        { state: PlayerState.FLYING_RIGHT, name: "right down crash 2" },
        { state: PlayerState.FLYING_LEFT_DOWN, name: "right down crash 1", flip: true },
        { state: PlayerState.FLYING_LEFT, name: "right down crash 2", flip: true }
      ];
      
      // Add sprites to the map
      for (const mapping of spriteStateMapping) {
        const sprite = this.spriteAtlas.getSprite(
          mapping.name + ".png", // Try with extension first
          mapping.flip || false,
          1.0
        );
        
        if (sprite) {
          // Debug log to verify rotation information
          console.debug(`Loaded sprite for state ${PlayerState[mapping.state]}: ${mapping.name}, rotated: ${sprite.isRotated()}`);
          console.log(`Sprite dimensions: ${sprite.getSrcWidth()} x ${sprite.getSrcHeight()}`);
          this.sprites.set(mapping.state, sprite);
        } else {
          console.warn(`Sprite not found for state ${PlayerState[mapping.state]}, name: ${mapping.name}`);
        }
      }
      
      console.debug(`Loaded ${this.sprites.size} sprites from atlas`);
      
      // Ensure we have at least basic sprites
      if (this.sprites.size < 5) {
        console.warn("Not enough sprites were loaded from atlas, falling back to manual setup");
        // this.loadSpriteSheetManually();
      }
    } catch (error) {
      console.error("Error setting up sprites from atlas:", error);
      // this.loadSpriteSheetManually();
    }
  }

  private setupSprites(): void {
    if (!this.spriteSheet || this.spriteSheet.width === 0 || this.spriteSheet.height === 0) {
      console.error("Cannot setup player sprites: spritesheet is invalid");
      return;
    }

    try {
      // Assuming the spritesheet is a 4x3 grid
      /*
      CRASHED           FLYING_DOWN       FLYING_RIGHT_DOWN   FLYING_RIGHT
      SKIER1_DOWN       SKIER1_DOWN_RIGHT SKIER1_RIGHT        SKIER2_DOWN
      SKIER2_DOWN_RIGHT SKIER2_RIGHT 
      */
      const frameWidth = this.spriteSheet.width / 4;
      const frameHeight = this.spriteSheet.height / 3;

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
        new Sprite(this.p, this.spriteSheet, frameWidth, 0, frameWidth, frameHeight));

      this.sprites.set(PlayerState.FLYING_RIGHT_DOWN,
        new Sprite(this.p, this.spriteSheet, frameWidth * 2, 0, frameWidth, frameHeight));

      this.sprites.set(PlayerState.FLYING_RIGHT,
        new Sprite(this.p, this.spriteSheet, frameWidth * 3, 0, frameWidth, frameHeight));

      this.sprites.set(PlayerState.FLYING_LEFT_DOWN,
        new Sprite(this.p, this.spriteSheet, frameWidth * 2, 0, frameWidth, frameHeight, true));

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
      // Use a fixed offset below the sprite for ski tracks
      const skiOffset = 40; // Increased offset to place tracks at the "feet" of the skier
      
      // Calculate position at the bottom center of the sprite bounding box
      const trackX = this.worldPos.x;
      let trackY = this.worldPos.y;
      
      // Account for terrain height adjustment
      if (this.useTerrainHeight) {
        trackY -= this.currentVisualHeight;
      }
      
      // Offset downward to place tracks at the skier's "feet"
      trackY += skiOffset;
      
      // Add the ski track point
      this.game.skiTrack.addPoint(trackX, trackY);
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
    // Refresh render data before rendering
    this.renderer.updateRenderData(this.getRenderData());
    this.renderer.render();
  }

  // Toggle terrain height adjustment
  public toggleTerrainHeight(): void {
    this.useTerrainHeight = !this.useTerrainHeight;
    console.debug(`Terrain height adjustment: ${this.useTerrainHeight ? 'ON' : 'OFF'}`);
  }

  // Toggle terrain rotation adjustment
  public toggleTerrainRotation(): void {
    this.useTerrainRotation = !this.useTerrainRotation;
    console.debug(`Terrain rotation adjustment: ${this.useTerrainRotation ? 'ON' : 'OFF'}`);
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

    console.debug('Player collided with obstacle:', obstacle.type);

    // Increment collision count
    this.collisionCount++;
    console.debug(`Collision count: ${this.collisionCount}`);

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

    console.debug(`Player is now flying! Current state: ${PlayerState[this.currentState]}`);
  }

  /**
   * Transitions the player to crashed state
   */
  private transitionToCrashed(): void {
    this.currentState = PlayerState.CRASHED;
    this.crashRecoveryTimer = this.crashRecoveryDuration;
    console.debug("Player has crashed!");
  }

  /**
   * Resets player after a crash
   */
  private resetAfterCrash(): void {
    this.currentState = PlayerState.DOWN;
    this.collisionCount = 0;
    console.debug("Player recovered from crash");
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