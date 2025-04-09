import p5 from 'p5';
import { SkierEntity, SkierState } from './skier/skier.entity';
import { Game } from './game';
import { Position } from './camera';
import { GameEntity } from './entityManager';

export enum AISkierType {
  FAST_VERTICAL, // Starts behind player, moves faster and passes
  SLOW_VERTICAL, // Starts ahead of player, moves slower and gets passed
  HORIZONTAL     // Crosses the slope horizontally
}

/**
 * AI-specific implementation of the SkierEntity
 */
export class AISkier extends SkierEntity {
    private skierType: AISkierType;
    private horizontalSpeed: number;
    private avoidanceRange: number = 150; // How far ahead the AI looks for obstacles
    
    constructor(
        p: p5,
        worldPos: Position,
        skierType: AISkierType,
        game: Game,
        speed: number,
        variantType: number = 2 // Default to skiier2 variant
    ) {
        // Call base constructor with 'aiSkier' type and the specified variant
        super(p, worldPos, game, 'aiSkier', variantType);
        
        this.skierType = skierType;
        this.skierData.currentSpeed = speed;
        
        // Set initial state and speed based on skier type
        if (skierType === AISkierType.HORIZONTAL) {
            this.skierData.currentState = Math.random() > 0.5 ? SkierState.RIGHT : SkierState.LEFT;
            this.horizontalSpeed = speed * (Math.random() > 0.5 ? 1 : -1); // Horizontal speed (right or left)
        } else {
            this.skierData.currentState = SkierState.DOWN;
            this.horizontalSpeed = 0;
        }
    }
    
    /**
     * Load AI-specific assets
     */
    protected loadAssets(variantType: number): void {
        // Get the player atlas from the game
        const playerAtlas = this.skierData.game.getSpriteAtlas('player');
        
        if (!playerAtlas || !playerAtlas.isLoaded()) {
            console.warn("Player atlas not loaded yet. Will retry later.");
            // We'll try again during the first update
            return;
        }
        
        try {
            // Use skiier2 or skiier3 variant based on variantType
            const prefix = variantType === 1 ? "skiier" : 
                           variantType === 3 ? "skiier3" : "skiier2";
                        
            // Map states to sprite names
            const spriteStateMapping = [
                { state: SkierState.DOWN, name: `${prefix} down` },
                { state: SkierState.RIGHT_DOWN, name: `${prefix} right down` },
                { state: SkierState.RIGHT, name: `${prefix} right` },
                // Use the same sprites for left states but with flip=true
                { state: SkierState.LEFT_DOWN, name: `${prefix} right down`, flip: true },
                { state: SkierState.LEFT, name: `${prefix} right`, flip: true },
                // Use normal skier crashed state for all variants
                { state: SkierState.CRASHED, name: "crash" }
            ];
            
            // Load each sprite
            for (const mapping of spriteStateMapping) {
                const sprite = playerAtlas.getSprite(
                    mapping.name + ".png", // Try with extension first
                    mapping.flip || false,
                    1.0
                );
                
                if (sprite) {
                    this.skierData.sprites.set(mapping.state, sprite);
                } else {
                    console.warn(`AI Skier: Sprite not found for state ${SkierState[mapping.state]}, name: ${mapping.name}`);
                }
            }
            
            this.skierData.assetsLoaded = this.skierData.sprites.size > 0;
            
            if (this.skierData.assetsLoaded) {
                console.debug(`AI Skier: Loaded ${this.skierData.sprites.size} sprites for variant ${variantType}`);
            } else {
                console.warn(`AI Skier: Failed to load sprites for variant ${variantType}`);
            }
            
        } catch (error) {
            console.error("Error loading AI skier sprites:", error);
        }
    }
    
    /**
     * Override update method for AI-specific behavior
     */
    public update(scrollSpeed: number = 0, horizontalOffset: number = 0): void {
        // If assets aren't loaded yet, try loading them
        if (!this.skierData.assetsLoaded) {
            this.loadAssets(this.skierData.variantType || 2);
            return;
        }
        
        // Apply vertical movement based on skier type and game scroll speed
        let effectiveScrollSpeed = scrollSpeed;
        
        if (this.skierType === AISkierType.FAST_VERTICAL) {
            // Move faster than scroll speed (overtake player)
            effectiveScrollSpeed = scrollSpeed;
        } else if (this.skierType === AISkierType.SLOW_VERTICAL) {
            // Move slower than scroll speed (get passed by player)
            effectiveScrollSpeed = scrollSpeed;
            this.skierData.currentSpeed *= 0.5; // Slow down
        }
        
        // Call base update with AI-specific scroll speed
        super.update(effectiveScrollSpeed, this.horizontalSpeed);
        
        // Update AI behavior after basic movement is applied
        this.updateAIBehavior();
    }
      /**
     * AI-specific behavior logic
     */
    private updateAIBehavior(): void {
        // Skip AI logic if crashed
        if (this.skierData.currentState === SkierState.CRASHED) {
            return;
        }
        
        // Simple obstacle avoidance - check for obstacles ahead
        // Get all entities from the entityManager
        const allEntities = this.skierData.game.entityManager.getAllEntities();
        
        const obstaclesAhead = allEntities.filter((entity) => {
            // Don't avoid self
            if (entity.worldPos === this.skierData.worldPos) return false;
            
            // Check if obstacle is ahead within the avoidance range
            const distance = Math.sqrt(
                Math.pow(entity.worldPos.x - this.skierData.worldPos.x, 2) + 
                Math.pow(entity.worldPos.y - this.skierData.worldPos.y, 2)
            );
            
            return distance < this.avoidanceRange && entity.worldPos.y < this.skierData.worldPos.y;
        });
        
        if (obstaclesAhead.length > 0) {
            // Find closest obstacle
            const closestObstacle = obstaclesAhead.reduce((prev:GameEntity, curr) => {
                const prevDist = Math.sqrt(
                    Math.pow(prev.worldPos.x - this.skierData.worldPos.x, 2) + 
                    Math.pow(prev.worldPos.y - this.skierData.worldPos.y, 2)
                );
                const currDist = Math.sqrt(
                    Math.pow(curr.worldPos.x - this.skierData.worldPos.x, 2) + 
                    Math.pow(curr.worldPos.y - this.skierData.worldPos.y, 2)
                );
                return prevDist < currDist ? prev : curr;
            });
            
            // Avoid the obstacle by turning away from it
            if (closestObstacle.worldPos.x < this.skierData.worldPos.x) {
                // Obstacle is to the left, move right
                this.horizontalSpeed = Math.abs(this.horizontalSpeed || this.skierData.currentSpeed * 0.3);
                this.skierData.currentState = SkierState.RIGHT_DOWN;
            } else {
                // Obstacle is to the right, move left
                this.horizontalSpeed = -Math.abs(this.horizontalSpeed || this.skierData.currentSpeed * 0.3);
                this.skierData.currentState = SkierState.LEFT_DOWN;
            }
        } else {
            // Return to normal state if no obstacles
            if (this.skierType === AISkierType.HORIZONTAL) {
                // Maintain horizontal movement
                if (this.horizontalSpeed > 0) {
                    this.skierData.currentState = SkierState.RIGHT_DOWN;
                } else {
                    this.skierData.currentState = SkierState.LEFT_DOWN;
                }
            } else {
                // For vertical skiers, occasionally change direction randomly
                if (Math.random() < 0.01) { // 1% chance per frame to change direction
                    const direction = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                    
                    if (direction === -1) {
                        this.skierData.currentState = SkierState.LEFT_DOWN;
                        this.horizontalSpeed = -Math.abs(this.skierData.currentSpeed) * 0.3;
                    } else if (direction === 1) {
                        this.skierData.currentState = SkierState.RIGHT_DOWN;
                        this.horizontalSpeed = Math.abs(this.skierData.currentSpeed) * 0.3;
                    } else {
                        this.skierData.currentState = SkierState.DOWN;
                        this.horizontalSpeed = 0;
                    }
                }
            }
        }
        
        // Bounds checking - prevent AI skiers from going too far off-screen
        const screenWidth = this.p.width;
        const screenPos = this.skierData.game.camera.worldToScreen(this.skierData.worldPos);
        
        if (screenPos.x < -200) {
            this.horizontalSpeed = Math.abs(this.horizontalSpeed || this.skierData.currentSpeed * 0.3);
            this.skierData.currentState = SkierState.RIGHT_DOWN;
        } else if (screenPos.x > screenWidth + 200) {
            this.horizontalSpeed = -Math.abs(this.horizontalSpeed || this.skierData.currentSpeed * 0.3);
            this.skierData.currentState = SkierState.LEFT_DOWN;
        }
    }
    
    /**
     * AI skier specific crash method
     */
    public crash(): void {
        this.skierData.currentState = SkierState.CRASHED;
        this.horizontalSpeed = 0;
    }
}
