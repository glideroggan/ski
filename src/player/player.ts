import p5 from 'p5';
import { SkierEntity, SkierState } from '../skier/skier.entity';
import { Game } from '../game';
import { Position } from '../camera';
import { SpriteAtlas } from '../spriteAtlas';
import { ICollidable } from '../collision/ICollidable';

/**
 * Player-specific implementation of the SkierEntity
 */
export class Player extends SkierEntity {
    // Track total crash count for game over condition
    private crashCount: number = 0;
    
    constructor(p: p5, pos: Position, game: Game) {
        // Call base constructor with 'player' type and variant 1
        super(p, pos, game, 'player', 1);
    }
    
    /**
     * Load player-specific assets
     */
    protected loadAssets(variantType: number): void {
        // Create sprite atlas
        const spriteAtlas = new SpriteAtlas(this.skierData.p);
        
        // Load the TexturePacker atlas
        spriteAtlas.loadAtlas('assets/player.json', 'assets/player.png')
            .then(() => {
                console.debug("Player sprite atlas loaded successfully");
                this.setupSpritesFromAtlas(spriteAtlas);
                this.skierData.assetsLoaded = true;
            })
            .catch(err => {
                console.error("Failed to load player sprite atlas:", err);
            });
    }
    
    /**
     * Setup player-specific sprites from the atlas
     */
    private setupSpritesFromAtlas(spriteAtlas: SpriteAtlas): void {
        if (!spriteAtlas.isLoaded()) {
            console.error("Cannot setup sprites: sprite atlas is not loaded");
            return;
        }
        
        try {
            // Map TexturePacker frame names to skier states
            const spriteStateMapping = [
                { state: SkierState.CRASHED, name: "crash" },
                { state: SkierState.DOWN, name: "skiier down" },
                { state: SkierState.RIGHT_DOWN, name: "skiier right down" },
                { state: SkierState.RIGHT, name: "skiier right" },
                // Use the same sprites for left states but with flip=true
                { state: SkierState.LEFT_DOWN, name: "skiier right down", flip: true },
                { state: SkierState.LEFT, name: "skiier right", flip: true },
                // Flying states
                { state: SkierState.FLYING_DOWN, name: "down crash 1" },
                { state: SkierState.FLYING_RIGHT_DOWN, name: "right down crash 1" },
                { state: SkierState.FLYING_RIGHT, name: "right down crash 2" },
                { state: SkierState.FLYING_LEFT_DOWN, name: "right down crash 1", flip: true },
                { state: SkierState.FLYING_LEFT, name: "right down crash 2", flip: true }
            ];
            
            // Add sprites to the map
            for (const mapping of spriteStateMapping) {
                const sprite = spriteAtlas.getSprite(
                    mapping.name + ".png", // Try with extension first
                    mapping.flip || false,
                    1.0
                );
                
                if (sprite) {
                    console.debug(`Loaded sprite for state ${SkierState[mapping.state]}: ${mapping.name}`);
                    this.skierData.sprites.set(mapping.state, sprite);
                } else {
                    console.warn(`Sprite not found for state ${SkierState[mapping.state]}, name: ${mapping.name}`);
                }
            }
            
            console.debug(`Loaded ${this.skierData.sprites.size} sprites from atlas`);
        } catch (error) {
            console.error("Error setting up sprites from atlas:", error);
        }
    }
    
    /**
     * Override the update method for player-specific updates
     */
    public update(): void {
        // Call the base update method (with no scroll speed for player)
        super.update();
    }
    
    /**
     * Player-specific method to increase speed
     */
    public increaseSpeed(amount: number = 0.5): void {
        this.skierData.speedOffset += amount;
        console.debug(`Speed offset increased to ${this.skierData.speedOffset.toFixed(2)}`);
    }
    
    /**
     * Player-specific method to decrease speed
     */
    public decreaseSpeed(amount: number = 0.5): void {
        this.skierData.speedOffset -= amount;
        
        // In debug mode, allow reducing speed to zero or even negative
        // Otherwise, cap the negative offset to prevent too much slowdown
        if (!this.skierData.game.debug) {
            const minOffset = -2.5; // Allow slowing down to at most 2.5 units below base speed
            if (this.skierData.speedOffset < minOffset) {
                this.skierData.speedOffset = minOffset;
            }
        }
        
        console.debug(`Speed offset decreased to ${this.skierData.speedOffset.toFixed(2)}`);
    }
    
    /**
     * Player-specific method to reset speed
     */
    public resetSpeed(): void {
        this.skierData.speedOffset = 0;
        console.debug("Speed reset to base value");
    }
    
    /**
     * Get player's speed offset from the base speed
     */
    public getSpeedOffset(): number {
        return this.skierData.speedOffset;
    }
    
    /**
     * Player-specific method to turn left
     * Delegates to the updater
     */
    public turnLeft(): boolean {
        return this.updater.turnLeft();
    }
    
    /**
     * Player-specific method to turn right
     * Delegates to the updater
     */
    public turnRight(): boolean {
        return this.updater.turnRight();
    }
    
    /**
     * Override handleCollision to track crash count
     */
    public handleCollision(other: ICollidable): void {
        // Call base method to handle the collision
        super.handleCollision(other);
        
        // If player is now in a crashed state, increment the crash counter
        if (this.getCurrentState() === SkierState.CRASHED) {
            this.crashCount++;
            console.debug(`Player crash count increased to ${this.crashCount}`);
        }
    }
    
    /**
     * Get the total number of times the player has crashed
     */
    public getCrashCount(): number {
        return this.crashCount;
    }
    
    /**
     * Reset the crash count (used when restarting the game)
     */
    public resetCrashCount(): void {
        this.crashCount = 0;
    }
    
    /**
     * Get the player's current visual height (for debug display)
     */
    public getVisualHeight(): number {
        return this.skierData.zAxis;
    }
    
    /**
     * Get the player's current ground level (for debug display)
     */
    public getGroundLevel(): number {
        return this.skierData.groundLevel;
    }
    
    /**
     * Get the player's current vertical velocity (for debug display)
     */
    public getVerticalVelocity(): number {
        return this.skierData.verticalVelocity;
    }
    
    /**
     * Check if the player is currently grounded (for debug display)
     */
    public isGrounded(): boolean {
        return this.skierData.isGrounded;
    }

    /**
     * Handle collisions specifically with slalom gates
     * This method is called by SlalomGate when player interacts with a gate
     * 
     * @param hitPole Whether the player hit a pole (true) or passed through successfully (false)
     */
    public handleGateCollision(hitPole: boolean): void {
        if (hitPole) {
            // Only apply collision effect if player actually hit a pole
            this.skierData.collisionEffectTimer = 20; // Shorter effect than tree/rock collisions
            console.debug("Player hit a slalom gate pole");
        } else {
            // Successful pass - no collision effect needed
            console.debug("Player successfully passed through a slalom gate");
        }
    }
}