import p5 from 'p5';
import { SkierEntity, SkierState } from './skier/skier.entity';
import { Game } from './game';
import { Position } from './camera';
import { GameEntity } from './entityManager';

export enum AISkierType {
  FAST_VERTICAL, // Moves faster than player (overtaking)
  SLOW_VERTICAL, // Moves slower than player (gets passed)
  HORIZONTAL     // Moves sideways across the slope
}

/**
 * AI-specific implementation of the SkierEntity
 */
export class AISkier extends SkierEntity {
    private skierType: AISkierType;
    private avoidanceRange: number = 150; // How far ahead the AI looks for obstacles
    private horizontalFactor: number = 0; // Factor for horizontal movement (-1 to 1)
    
    constructor(
        p: p5,
        worldPos: Position,
        skierType: AISkierType,
        game: Game,
        baseSpeed: number,
        variantType: number = 2 // Default to skiier2 variant
    ) {
        // Call base constructor with 'aiSkier' type and the specified variant
        super(p, worldPos, game, 'aiSkier', variantType);
        
        this.skierType = skierType;
        
        // Set initial speed based on skier type relative to the player's speed
        if (skierType === AISkierType.FAST_VERTICAL) {
            // Faster than baseSpeed (typically player's speed)
            this.skierData.currentSpeed = baseSpeed * 1.3;
            this.horizontalFactor = 0; // Primarily vertical
        } else if (skierType === AISkierType.SLOW_VERTICAL) {
            // Slower than baseSpeed
            this.skierData.currentSpeed = baseSpeed * 0.7;
            this.horizontalFactor = 0; // Primarily vertical
        } else if (skierType === AISkierType.HORIZONTAL) {
            // Similar speed but mostly horizontal movement
            this.skierData.currentSpeed = baseSpeed * 0.8;
            // Random horizontal direction (left or right)
            this.horizontalFactor = Math.random() > 0.5 ? 0.8 : -0.8;
        }
        
        // Set initial state based on movement direction
        if (this.horizontalFactor > 0.3) {
            this.skierData.currentState = SkierState.RIGHT_DOWN;
        } else if (this.horizontalFactor < -0.3) {
            this.skierData.currentState = SkierState.LEFT_DOWN;
        } else {
            this.skierData.currentState = SkierState.DOWN;
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
    public update(): void {
        // If assets aren't loaded yet, try loading them
        if (!this.skierData.assetsLoaded) {
            this.loadAssets(this.skierData.variantType || 2);
            return;
        }
        
        // Call base update without passing scrollSpeed
        // The horizontalFactor will be used internally by updateAIMovement
        super.update();
        
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
        
        // Apply AI movement logic based on current state and type
        this.updateAIMovement();
        
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
                this.horizontalFactor = 0.5;
                this.skierData.currentState = SkierState.RIGHT_DOWN;
            } else {
                // Obstacle is to the right, move left
                this.horizontalFactor = -0.5;
                this.skierData.currentState = SkierState.LEFT_DOWN;
            }
        } else {
            // Return to normal behavior if no obstacles
            this.resetToDefaultBehavior();
        }
        
        // Bounds checking - prevent AI skiers from going too far off-screen
        this.doBoundaryCheck();
    }
    
    /**
     * Updates AI movement based on its type and current state
     */
    private updateAIMovement(): void {
        // Update skier state based on horizontal factor
        if (this.horizontalFactor > 0.3) {
            if (this.horizontalFactor > 0.7) {
                this.skierData.currentState = SkierState.RIGHT;
            } else {
                this.skierData.currentState = SkierState.RIGHT_DOWN;
            }
        } else if (this.horizontalFactor < -0.3) {
            if (this.horizontalFactor < -0.7) {
                this.skierData.currentState = SkierState.LEFT;
            } else {
                this.skierData.currentState = SkierState.LEFT_DOWN;
            }
        } else {
            this.skierData.currentState = SkierState.DOWN;
        }
    }
    
    /**
     * Reset AI to default behavior based on its type
     */
    private resetToDefaultBehavior(): void {
        if (this.skierType === AISkierType.HORIZONTAL) {
            // Maintain strong horizontal bias
            this.horizontalFactor = Math.abs(this.horizontalFactor) > 0.1 ? 
                this.horizontalFactor : 
                (Math.random() > 0.5 ? 0.8 : -0.8);
                
            // Update state based on direction
            if (this.horizontalFactor > 0) {
                this.skierData.currentState = SkierState.RIGHT_DOWN;
            } else {
                this.skierData.currentState = SkierState.LEFT_DOWN;
            }
        } else {
            // For vertical skiers, occasionally change direction randomly
            if (Math.random() < 0.01) { // 1% chance per frame to change direction
                const direction = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                
                if (direction === -1) {
                    this.horizontalFactor = -0.3;
                    this.skierData.currentState = SkierState.LEFT_DOWN;
                } else if (direction === 1) {
                    this.horizontalFactor = 0.3;
                    this.skierData.currentState = SkierState.RIGHT_DOWN;
                } else {
                    this.horizontalFactor = 0;
                    this.skierData.currentState = SkierState.DOWN;
                }
            }
        }
    }
    
    /**
     * Check and handle screen boundaries
     */
    private doBoundaryCheck(): void {
        const screenWidth = this.p.width;
        const screenPos = this.skierData.game.camera.worldToScreen(this.skierData.worldPos);
        
        if (screenPos.x < -200) {
            this.horizontalFactor = 0.5;
            this.skierData.currentState = SkierState.RIGHT_DOWN;
        } else if (screenPos.x > screenWidth + 200) {
            this.horizontalFactor = -0.5;
            this.skierData.currentState = SkierState.LEFT_DOWN;
        }
    }
    
    /**
     * AI skier specific crash method
     */
    public crash(): void {
        this.skierData.currentState = SkierState.CRASHED;
        this.horizontalFactor = 0;
    }
}
