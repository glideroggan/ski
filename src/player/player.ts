import p5 from 'p5';
import { Sprite } from '../sprite';
import { SpriteAtlas } from '../spriteAtlas';
import { CollisionOffset, Obstacle } from '../obstacleManager';
import { Game, RenderableObject } from '../game';
import { Position } from '../camera';
import { PlayerRenderer } from './player.rendering';
import { PlayerUpdate } from './player.update';

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

// Shared player state that is referenced by all components
export class PlayerData {
  p: p5;
  assetsLoaded: boolean = false;
  spriteSheet: p5.Image | null = null;
  sprites: Map<PlayerState, Sprite> = new Map();
  currentState: PlayerState = PlayerState.DOWN;
  game: Game;
  worldPos: Position;
  width: number = 50;
  height: number = 80;
  useTerrainHeight: boolean = true;
  useTerrainRotation: boolean = true;
  currentVisualHeight: number = 0;
  currentRotation: number = 0;
  terrainRotationFactor: number = 0.02;
  terrainHeightFactor: number = 45;
  collisionEffect: number = 0;
  debug: boolean = false;
  
  // Speed transition properties
  currentSpeed: number = 4;          // Actual current speed after smoothing
  speedOffset: number = 0;           // Player's speed adjustment (can be positive or negative)
  speedTransitionFactor: number = 0.1; // How quickly speed changes (0-1)

  constructor(p: p5, game: Game, pos: Position) {
    this.p = p;
    this.game = game;
    this.worldPos = pos;
  }

  getCollisionHitbox(): { position: Position, width: number, height: number } {
    // Apply collision offset for better collision detection
    const adjustedPosition: Position = {
      x: this.worldPos.x,
      y: this.worldPos.y + 20 // Hardcoded yOffset from playerCollisionOffset
    };

    // If terrain height is enabled, adjust the collision hitbox Y position
    adjustedPosition.y -= this.currentVisualHeight;

    const adjustedWidth = this.width * 0.6; // Hardcoded widthFactor
    const adjustedHeight = this.height * 0.15; // Hardcoded heightFactor

    return {
      position: adjustedPosition,
      width: adjustedWidth,
      height: adjustedHeight
    };
  }
}

// Interface for passing methods to components
export interface PlayerMethods {
  isFlying(): boolean;
  isCrashed(): boolean;
}

// Keeping the old interface for backward compatibility
export interface PlayerRenderData {
  // ...existing code...
}

export class Player implements RenderableObject {
  private playerData: PlayerData;
  
  // Add references to the rendering and update components
  private renderer: PlayerRenderer;
  private updater: PlayerUpdate;

  // Player collision adjustment for 45-degree perspective
  playerCollisionOffset: CollisionOffset = {
    xOffset: 0,
    yOffset: 20,
    widthFactor: 0.6,
    heightFactor: 0.15, // Focus on upper part of player for collision
  };

  constructor(p: p5, pos: Position, game: Game) {
    // Create a single shared state object
    this.playerData = new PlayerData(p, game, pos);
    
    // Pass the shared state to components
    this.renderer = new PlayerRenderer(this.playerData, this);
    this.updater = new PlayerUpdate(this.playerData, this);
    
    this.loadAssets();
  }

  // Getter/setters for world position
  get worldPos(): Position {
    return this.playerData.worldPos;
  }
  
  set worldPos(pos: Position) {
    this.playerData.worldPos = pos;
  }

  // Getter for width/height
  get width(): number {
    return this.playerData.width;
  }
  
  get height(): number {
    return this.playerData.height;
  }

  // Getter for terrainHeightFactor
  get terrainHeightFactor(): number {
    return this.playerData.terrainHeightFactor;
  }

  private loadAssets(): void {
    // Create sprite atlas
    const spriteAtlas = new SpriteAtlas(this.playerData.p);
    
    // Load the TexturePacker atlas
    spriteAtlas.loadAtlas('assets/player.json', 'assets/player.png')
      .then(() => {
        console.debug("Player sprite atlas loaded successfully");
        this.setupSpritesFromAtlas(spriteAtlas);
        this.playerData.assetsLoaded = true;
      })
      .catch(err => {
        console.error("Failed to load player sprite atlas:", err);
      });
  }

  private setupSpritesFromAtlas(spriteAtlas: SpriteAtlas): void {
    if (!spriteAtlas.isLoaded()) {
      console.error("Cannot setup sprites: sprite atlas is not loaded");
      return;
    }
    
    try {
      // Map TexturePacker frame names to player states
      const spriteStateMapping = [
        { state: PlayerState.CRASHED, name: "crash" },
        { state: PlayerState.DOWN, name: "skiier down" },
        { state: PlayerState.RIGHT_DOWN, name: "skiier right down" },
        { state: PlayerState.RIGHT, name: "skiier right" },
        // Use the same sprites for left states but with flip=true
        { state: PlayerState.LEFT_DOWN, name: "skiier right down", flip: true },
        { state: PlayerState.LEFT, name: "skiier right", flip: true },
        // Flying states
        { state: PlayerState.FLYING_DOWN, name: "down crash 1" },
        { state: PlayerState.FLYING_RIGHT_DOWN, name: "right down crash 1" },
        { state: PlayerState.FLYING_RIGHT, name: "right down crash 2" },
        { state: PlayerState.FLYING_LEFT_DOWN, name: "right down crash 1", flip: true },
        { state: PlayerState.FLYING_LEFT, name: "right down crash 2", flip: true }
      ];
      
      // Add sprites to the map
      for (const mapping of spriteStateMapping) {
        const sprite = spriteAtlas.getSprite(
          mapping.name + ".png", // Try with extension first
          mapping.flip || false,
          1.0
        );
        
        if (sprite) {
          console.debug(`Loaded sprite for state ${PlayerState[mapping.state]}: ${mapping.name}, rotated: ${sprite.isRotated()}`);
          // console.log(`Sprite dimensions: ${sprite.getSrcWidth()} x ${sprite.getSrcHeight()}`);
          this.playerData.sprites.set(mapping.state, sprite);
        } else {
          console.warn(`Sprite not found for state ${PlayerState[mapping.state]}, name: ${mapping.name}`);
        }
      }
      
      console.debug(`Loaded ${this.playerData.sprites.size} sprites from atlas`);
    } catch (error) {
      console.error("Error setting up sprites from atlas:", error);
    }
  }

  public update(): void {
    // Delegate update to the PlayerUpdate component
    this.updater.update();
  }

  /**
   * Returns the adjusted collision hitbox for the player
   */
  public getCollisionHitbox(): { position: Position, width: number, height: number } {
    return this.playerData.getCollisionHitbox();
  }

  public render(): void {
    // Delegate rendering to the PlayerRenderer component
    this.renderer.render();
  }

  // Toggle terrain height adjustment
  public toggleTerrainHeight(): void {
    this.playerData.useTerrainHeight = !this.playerData.useTerrainHeight;
    console.debug(`Terrain height adjustment: ${this.playerData.useTerrainHeight ? 'ON' : 'OFF'}`);
  }

  // Toggle terrain rotation adjustment
  public toggleTerrainRotation(): void {
    this.playerData.useTerrainRotation = !this.playerData.useTerrainRotation;
    console.debug(`Terrain rotation adjustment: ${this.playerData.useTerrainRotation ? 'ON' : 'OFF'}`);
  }

  public turnRight(): boolean {
    return this.updater.turnRight();
  }

  public turnLeft(): boolean {
    return this.updater.turnLeft();
  }

  public getCurrentState(): PlayerState {
    return this.playerData.currentState;
  }

  public getCurrentRotation(): number {
    return this.playerData.currentRotation;
  }

  public getCurrentVisualHeight(): number {
    return this.playerData.currentVisualHeight;
  }

  public handleCollision(obstacle: Obstacle): void {
    this.updater.handleCollision(obstacle);
  }

  /**
   * Checks if player is in a flying state
   */
  public isFlying(): boolean {
    return this.updater.isFlying();
  }

  /**
   * Checks if player is in crashed state
   */
  public isCrashed(): boolean {
    return this.updater.isCrashed();
  }

  public isInCollisionState(): boolean {
    return this.updater.isInCollisionState();
  }

  public toggleDebug(): void {
    this.playerData.debug = !this.playerData.debug;
  }

  /**
   * Increase the player's speed (positive offset from base speed)
   */
  public increaseSpeed(amount: number = 0.5): void {
    this.playerData.speedOffset += amount;
    console.debug(`Speed offset increased to ${this.playerData.speedOffset.toFixed(2)}`);
  }

  /**
   * Decrease the player's speed (negative offset from base speed, limited by base speed)
   */
  public decreaseSpeed(amount: number = 0.5): void {
    this.playerData.speedOffset -= amount;
    
    // Cap the negative offset to prevent too much slowdown
    const minOffset = -2.5; // Allow slowing down to at most 2.5 units below base speed
    if (this.playerData.speedOffset < minOffset) {
      this.playerData.speedOffset = minOffset;
    }
    
    console.debug(`Speed offset decreased to ${this.playerData.speedOffset.toFixed(2)}`);
  }

  /**
   * Reset speed offset to zero (return to base speed)
   */
  public resetSpeed(): void {
    this.playerData.speedOffset = 0;
    console.debug("Speed reset to base value");
  }

  /**
   * Get current actual speed (after smoothing)
   */
  public getCurrentSpeed(): number {
    return this.playerData.currentSpeed;
  }

  /**
   * Get player's speed offset from the base speed
   */
  public getSpeedOffset(): number {
    return this.playerData.speedOffset;
  }
}