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
  LEFT
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

  constructor(p: p5, pos: Position, game: Game) {
    this.p = p;
    this.game = game;
    this.worldPos = pos;
    this.loadAssets();
  }

  // Player collision adjustment for 45-degree perspective
  playerCollisionOffset: CollisionOffset = {
    xOffset: 0,
    yOffset: 30,
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
    } catch (error) {
      console.error("Error setting up player sprites:", error);
    }
  }

  public update(): void {

    // increase world position to simulate movement
    this.worldPos.y += 1;

    // handle horizontal movement
    switch (this.currentState) {
      case PlayerState.LEFT:
        this.worldPos.x -= this.maxPlayerMovement;
        break;
      case PlayerState.RIGHT:
        this.worldPos.x += this.maxPlayerMovement;
        break;
      case PlayerState.LEFT_DOWN:
        this.worldPos.x -= this.maxPlayerMovement / 2;
        this.worldPos.y += this.maxPlayerMovement / 2;
        break;
      case PlayerState.RIGHT_DOWN:
        this.worldPos.x += this.maxPlayerMovement / 2;
        this.worldPos.y += this.maxPlayerMovement / 2;
        break;
      case PlayerState.DOWN:
        // No horizontal movement when going straight down
        this.worldPos.y += this.maxPlayerMovement;
        break;
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
    const x = screenPos.x - this.width / 2;
    const y = screenPos.y - this.height / 2;

    sprite.render(x, y, this.width, this.height);

    if (this.collisionEffect > 0) {
      this.p.pop(); // Restore drawing state
    }

    // Debug collision box
    if (this.debug) {
      // Draw player position indicator
      this.p.noFill();
      this.p.stroke(0, 255, 0);
      this.p.circle(screenPos.x, screenPos.y, 10);

      // Draw hitbox
      this.p.stroke(255, 0, 0);
      this.p.rect(
        x + (this.width * (1 - this.playerCollisionOffset.widthFactor)) / 2,
        y + this.playerCollisionOffset.yOffset,
        this.width * this.playerCollisionOffset.widthFactor,
        this.height * this.playerCollisionOffset.heightFactor
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

  public handleCollision(obstacle: Obstacle): void {
    // Set collision effect for visual feedback (lasts 30 frames)
    this.collisionEffect = 30;

    console.log('Player collided with obstacle:', obstacle.type);

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

  public isInCollisionState(): boolean {
    return this.collisionEffect > 0;
  }

  public toggleDebug(): void {
    this.debug = !this.debug;
  }
}