import p5 from 'p5';
import { Game, RenderableObject } from '../game';
import { Position } from '../camera';
import { Sprite } from '../sprite';
import { CollisionHitbox, ICollidable } from '../collision/ICollidable';
import { SkierRenderer } from './skier.renderer';
import { SkierUpdater } from './skier.updater';
import { SkiTrack } from './skiTrack';
import { SkierPhysics } from './skier.physics';

/**
 * Shared enum for all skier states
 */
export enum SkierState {
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

export type EntityType = 'player' | 'aiSkier' | 'tree' | 'rock' | 'snowman' | 'snowdrift';

/**
 * Shared data structure for skier entities
 */
export class SkierData {
    p: p5;
    game: Game;
    worldPos: Position;
    width: number = 50;
    height: number = 80;
    sprites: Map<SkierState, Sprite> = new Map();
    currentState: SkierState = SkierState.DOWN;
    assetsLoaded: boolean = false;
    // Type of skier entity for collision detection
    type: EntityType;
    skiTrack: SkiTrack;
    showShadow: boolean = false; // Flag to show shadow

    zAxis: number = 0; // Z-axis position for 3D effect

    // Visual properties
    currentRotation: number = 0;
    terrainRotationFactor: number = 0.08;
    terrainHeightFactor: number = 15; // Reduced from 45 to create more natural jumps

    // Collision and speed properties
    collisionEffectTimer: number = 0; // Timer for collision effect
    currentSpeed: number = 4;
    speedOffset: number = 0;
    speedTransitionFactor: number = 0.04; // Reduced from 0.1 for smoother transitions

    // Gravity and ground detection properties
    isGrounded: boolean = true;
    gravityValue: number = 0.02; 
    verticalVelocity: number = 0; // Current vertical speed from gravity
    groundLevel: number = 0; // Current terrain height at skier's position
    
    variantType: number = 1; // Variant type for different skier appearances

    // Debug flag
    debug: boolean = false;
    

    constructor(p: p5, game: Game, pos: Position, type: EntityType) {
        this.p = p;
        this.game = game;
        this.worldPos = pos;
        this.type = type;
        this.skiTrack = new SkiTrack(p);
    }

    /**
     * Returns the adjusted collision hitbox
     */
    getCollisionHitbox(): CollisionHitbox {
        // Apply collision offset for better collision detection
        const adjustedPosition: Position = {
            x: this.worldPos.x,
            y: this.worldPos.y + 20 // Common yOffset for all skiers
        };

        // If terrain height is enabled, adjust the collision hitbox Y position
        adjustedPosition.y -= this.zAxis;

        const adjustedWidth = this.width * 0.6;
        const adjustedHeight = this.height * 0.15;

        return {
            position: adjustedPosition,
            width: adjustedWidth,
            height: adjustedHeight
        };
    }
}

/**
 * Base class for all skier entities (player and AI)
 */
export abstract class SkierEntity implements RenderableObject, ICollidable {
    protected p: p5;
    protected skierData: SkierData;
    protected renderer: SkierRenderer;
    protected updater: SkierUpdater;

    public crashRecoveryTimer: number = 0;
    public readonly crashRecoveryDuration: number = 180; // 3 seconds to recover from crash
    physics: SkierPhysics;


    constructor(p: p5, pos: Position, game: Game, type: EntityType, variantType: number = 1) {
        this.p = p;
        this.skierData = new SkierData(p, game, pos, type);
        this.renderer = new SkierRenderer(this.skierData, this);
        this.updater = new SkierUpdater(this.skierData, this);
        this.physics = new SkierPhysics(this.skierData, this);

        // Each entity should load its own assets with the provided variant
        this.loadAssets(variantType);
    }

    // Getter/setters for required properties from interfaces
    get worldPos(): Position {
        return this.skierData.worldPos;
    }

    set worldPos(pos: Position) {
        this.skierData.worldPos = pos;
    }    get width(): number {
        return this.skierData.width;
    }

    get height(): number {
        return this.skierData.height;
    }

    get type(): 'player' | 'aiSkier' | 'tree' | 'rock' | 'snowman' {
        return this.skierData.type as 'player' | 'aiSkier' | 'tree' | 'rock' | 'snowman';
    }

    /**
     * Each skier entity should implement its own asset loading
     */
    protected abstract loadAssets(variantType: number): void;

    /**
     * Update method to be called each frame
     */
    public update(): void {
        // Update physics (includes flying state and terrain handling)
        this.physics.update();

        this.updater.update();
    }

    /**
     * Render method to be called each frame
     */
    public render(p: p5, game: Game): void {
        this.renderer.render(p, game);
    }

    /**
     * Render just the ski tracks for this entity
     * This is separated from the main render method to allow rendering tracks
     * before all dynamic entities, ensuring proper layering
     */
    public renderSkiTracksOnly(p: p5, game: Game): void {
        if (this.skierData.skiTrack) {
            this.skierData.skiTrack.render(p, (pos) => game.camera.worldToScreen(pos));
        }
    }

    /**
     * Get the current skier state
     */
    public getCurrentState(): SkierState {
        return this.skierData.currentState;
    }

    /**
     * Check if the skier is in a flying state
     */
    public isFlying(): boolean {
        return !this.skierData.isGrounded
    }

    /**
     * Check if the skier is in crashed state
     */
    public isCrashed(): boolean {
        return this.skierData.currentState === SkierState.CRASHED;
    }

    /**
     * Check if the skier is in any collision state (crashed, flying, or collision effect active)
     */
    public isInCollisionState(): boolean {
        /*
        currentState = CRASHED
        collisionEffectTimer > 0 (collision effect active)
        */ 
        return this.skierData.currentState === SkierState.CRASHED || this.skierData.collisionEffectTimer > 0;
    }

    /**
     * Handle collisions with other entities
     */
    public handleCollision(other: ICollidable): void {
        this.updater.handleCollision(other);
    }

    /**
     * Get the current rotation value
     */
    public getCurrentRotation(): number {
        return this.skierData.currentRotation;
    }

    /**
     * Get the current visual height
     */
    public getCurrentVisualHeight(): number {
        return this.skierData.zAxis;
    }

    /**
     * Get current speed
     */
    public getCurrentSpeed(): number {
        return this.skierData.currentSpeed;
    }

    /**
     * Toggle debug mode
     */
    public toggleDebug(): void {
        this.skierData.debug = !this.skierData.debug;
    }

    /**
     * Check if assets are loaded
     */
    public areSpritesLoaded(): boolean {
        return this.skierData.assetsLoaded;
    }

    /**
     * Get the sprites collection
     */
    public getSprites(): Map<SkierState, Sprite> {
        return this.skierData.sprites;
    }


    public transitionToFlyingState(): void {
        // TODO: handle transition to flying state
        // DOWN -> FLYING_DOWN
        // RIGHT_DOWN -> FLYING_RIGHT_DOWN
        // RIGHT -> FLYING_RIGHT
        // LEFT_DOWN -> FLYING_LEFT_DOWN
        // LEFT -> FLYING_LEFT
        switch (this.skierData.currentState) {
            case SkierState.DOWN:
                this.skierData.currentState = SkierState.FLYING_DOWN;
                break;
            case SkierState.RIGHT_DOWN:
                this.skierData.currentState = SkierState.FLYING_RIGHT_DOWN;
                break;
            case SkierState.RIGHT:
                this.skierData.currentState = SkierState.FLYING_RIGHT;
                break;
            case SkierState.LEFT_DOWN:
                this.skierData.currentState = SkierState.FLYING_LEFT_DOWN;
                break;
            case SkierState.LEFT:
                this.skierData.currentState = SkierState.FLYING_LEFT;
                break;
        }
    }

    /**
     * Transitions the skier to crashed state
     */
    public transitionToCrashed(): void {
        this.skierData.currentState = SkierState.CRASHED;
        this.crashRecoveryTimer = this.crashRecoveryDuration;
        console.debug(`${this.skierData.type} has crashed!`);
    }

    /**
     * Implement ICollidable's getCollisionHitbox method
     */
    public getCollisionHitbox(): CollisionHitbox {
        return this.skierData.getCollisionHitbox();
    }
}
