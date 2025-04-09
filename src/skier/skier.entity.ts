import p5 from 'p5';
import { Game, RenderableObject } from '../game';
import { Position } from '../camera';
import { Sprite } from '../sprite';
import { CollisionHitbox, ICollidable } from '../collision/ICollidable';
import { SkierRenderer } from './skier.renderer';
import { SkierUpdater } from './skier.updater';

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

export type EntityType = 'player' | 'aiSkier' | 'tree' | 'rock' | 'snowman';

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

    // Visual properties
    currentVisualHeight: number = 0;
    currentRotation: number = 0;
    terrainRotationFactor: number = 0.02;
    terrainHeightFactor: number = 45;

    // Collision and speed properties
    collisionEffect: number = 0;
    currentSpeed: number = 4;
    speedOffset: number = 0;
    speedTransitionFactor: number = 0.1;

    variantType: number = 1; // Variant type for different skier appearances

    // Debug flag
    debug: boolean = false;

    constructor(p: p5, game: Game, pos: Position, type: EntityType) {
        this.p = p;
        this.game = game;
        this.worldPos = pos;
        this.type = type;
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
        adjustedPosition.y -= this.currentVisualHeight;

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

    constructor(p: p5, pos: Position, game: Game, type: EntityType, variantType: number = 1) {
        this.p = p;
        this.skierData = new SkierData(p, game, pos, type);
        this.renderer = new SkierRenderer(this.skierData);
        this.updater = new SkierUpdater(this.skierData);

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
    public update(scrollSpeed: number = 0, horizontalOffset: number = 0): void {
        this.updater.update(scrollSpeed, horizontalOffset);
    }

    /**
     * Render method to be called each frame
     */
    public render(p: p5, game: Game): void {
        this.renderer.render(p, game);
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
        return this.updater.isFlying();
    }

    /**
     * Check if the skier is in crashed state
     */
    public isCrashed(): boolean {
        return this.updater.isCrashed();
    }

    /**
     * Check if the skier is in any collision state (crashed, flying, or collision effect active)
     */
    public isInCollisionState(): boolean {
        return this.updater.isInCollisionState();
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
        return this.skierData.currentVisualHeight;
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

    /**
     * Implement ICollidable's getCollisionHitbox method
     */
    public getCollisionHitbox(): CollisionHitbox {
        return this.skierData.getCollisionHitbox();
    }
}
