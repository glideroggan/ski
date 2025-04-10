import p5 from 'p5';
import { Sprite } from './sprite';
import { Game, RenderableObject } from './game';
import { Position } from './camera';
import { SpriteAtlas } from './spriteAtlas';
import { AISkier, AISkierType } from './aiSkier';
import { ICollidable, CollisionHitbox } from './collision/ICollidable';
import { Obstacle, ObstacleType } from './obstacle'; // Import the Obstacle class

// Interface for obstacle dimensions
export interface ObstacleDimensions {
    width: number;
    height: number;
}

// Define collision hitbox offsets for different entity types
export interface CollisionOffset {
    xOffset: number;
    yOffset: number;
    widthFactor: number;
    heightFactor: number;
}

// Union type for all game entities managed by this class
export type GameEntity = Obstacle | AISkier;

/**
 * EntityManager handles the spawning, updating, and lifecycle management of
 * game entities including static obstacles (trees, rocks, snowmen) and
 * dynamic entities like AI skiers.
 */
export class EntityManager {
    private p: p5;
    private game: Game;

    // Separate arrays for different entity types
    private staticObstacles: Obstacle[] = [];
    private aiSkiers: AISkier[] = [];

    // Asset management
    private spriteSheet: p5.Image | null = null;
    private sprites: Map<string, Sprite> = new Map();
    private atlasLoaded: boolean = false;

    // Spawning properties
    private obstacleSpawnCounter: number = 0;
    private baseObstacleSpawnInterval: number = 60; // Base spawn rate (1 per second at 60 FPS)
    private aiSkierSpawnTimer: number = 0;
    private aiSkierSpawnInterval: number = 180; // Base spawn interval for AI skiers (3 seconds at 60 FPS)

    // Gameplay properties
    private temporarySpeedBoost: boolean = false;
    private debug: boolean = false;

    // Obstacle types
    private obstacleTypes: ObstacleType[] = ['tree', 'rock', 'snowman'];

    // Collision adjustments for different entity types
    public collisionAdjustments: Map<string, CollisionOffset> = new Map();

    constructor(p: p5, game: Game) {
        this.p = p;
        this.game = game;

        // Initialize collision adjustments for different entity types
        this.initCollisionAdjustments();

        // Load assets
        this.loadAssets();
    }

    /**
     * Set up collision hitbox adjustments for different entity types
     */
    private initCollisionAdjustments(): void {
        // For trees, use a narrower hitbox at the bottom of the sprite
        this.collisionAdjustments.set('tree', {
            xOffset: 0,
            yOffset: 30,
            widthFactor: 0.3,
            heightFactor: 0.2
        });

        // For rocks, use a hitbox that covers most of the sprite
        this.collisionAdjustments.set('rock', {
            xOffset: 0,
            yOffset: 5,
            widthFactor: 0.8,
            heightFactor: 0.5
        });

        // For snowmen, use a medium-sized hitbox
        this.collisionAdjustments.set('snowman', {
            xOffset: 0,
            yOffset: 10,
            widthFactor: 0.7,
            heightFactor: 0.4
        });

        // For AI skiers, use similar hitbox to player
        this.collisionAdjustments.set('aiSkier', {
            xOffset: 0,
            yOffset: 15,
            widthFactor: 0.5,
            heightFactor: 0.3
        });
    }

    /**
     * Load obstacle sprites and atlas
     */
    private loadAssets(): void {
        // Load obstacle atlas
        const obstacleAtlas = new SpriteAtlas(this.p);
        obstacleAtlas.loadAtlas('assets/obstacles.json', 'assets/obstacles.png')
            .then(() => {
                console.debug("Obstacle sprite atlas loaded successfully");
                this.game.spriteAtlases.set('obstacles', obstacleAtlas);
                this.atlasLoaded = true;
            })
            .catch(err => {
                console.error("Failed to load obstacle sprite atlas:", err);
            });
    }

    /**
     * Returns all game entities for collision detection
     */
    public getAllEntities(): GameEntity[] {
        return [...this.staticObstacles, ...this.aiSkiers];
    }

    /**
     * Returns only the static obstacles
     */
    public getObstacles(): Obstacle[] {
        return this.staticObstacles;
    }

    /**
     * Returns only the AI skiers
     */
    public getAISkiers(): AISkier[] {
        return this.aiSkiers;
    }
    /**
     * Updates all entities in the game
     */
    public update(game: Game): void {
        // Update obstacle spawning and existing obstacles
        this.updateObstacles();

        // Update AI skier spawning and existing AI skiers
        this.updateAISkiers();

        // Remove entities that are too far off-screen
        this.cleanupEntities();
    }

    /**
     * Update obstacle spawning and movement
     */
    private updateObstacles(): void {
        // Spawn new obstacles
        this.obstacleSpawnCounter++;

        // Get current difficulty to adjust spawn rate
        const difficultyLevel = this.game.difficultyManager.getDifficultyLevel();

        // Higher difficulty = more obstacles (reduced spawn interval)
        const adjustedSpawnInterval = Math.max(20, this.baseObstacleSpawnInterval - (difficultyLevel / 100) * 40);

        if (this.obstacleSpawnCounter >= adjustedSpawnInterval) {
            this.spawnObstacle();
            this.obstacleSpawnCounter = 0;
        }

        // Call update on obstacles (allows for any obstacle-specific logic)
        for (const obstacle of this.staticObstacles) {
            obstacle.update();
        }
    }

    /**
     * Update AI skier spawning and behavior
     */
    private updateAISkiers(): void {
        // Increment the AI skier spawn timer
        this.aiSkierSpawnTimer++;

        // Get current difficulty to adjust AI skier spawn rate
        const difficultyLevel = this.game.difficultyManager.getDifficultyLevel();

        // Higher difficulty = more AI skiers (reduced spawn interval)
        const adjustedSpawnInterval = Math.max(60, this.aiSkierSpawnInterval - (difficultyLevel / 100) * 90);

        if (this.aiSkierSpawnTimer >= adjustedSpawnInterval) {
            // Spawn a new AI skier
            this.spawnRandomAISkier();
            this.aiSkierSpawnTimer = 0;
        }

        // Update existing AI skiers
        for (const aiSkier of this.aiSkiers) {
            aiSkier.update();
        }
    }

    /**
     * Spawns a random AI skier ahead of the player
     */
    private spawnRandomAISkier(): void {
        // Get the player's position
        const playerWorldPos = this.game.player.worldPos;

        // Calculate screen dimensions for positioning
        const screenWidth = this.p.width;
        const screenHeight = this.p.height;

        // Choose a random AI skier type with weighted probabilities
        const randomValue = Math.random();
        let aiType: AISkierType;
        
        if (randomValue < 0.4) {
            aiType = AISkierType.FAST_VERTICAL; // 40% chance
        } else if (randomValue < 0.7) {
            aiType = AISkierType.SLOW_VERTICAL; // 30% chance
        } else {
            aiType = AISkierType.HORIZONTAL; // 30% chance
        }

        // Calculate spawn position based on AI skier type
        let worldPos: Position;

        switch (aiType) {
            case AISkierType.FAST_VERTICAL:
                // Spawn BEHIND the player so they can overtake
                const distanceBehind = screenHeight * (0.7 + Math.random() * 0.8); // 0.7-1.5 screen heights behind
                worldPos = {
                    x: playerWorldPos.x + (Math.random() * screenWidth * 0.6 - screenWidth * 0.3), // Slightly random X near player
                    y: playerWorldPos.y - distanceBehind // Behind player (lower Y value)
                };
                break;
                
            case AISkierType.SLOW_VERTICAL:
                // Spawn AHEAD of the player so they get passed
                const distanceAhead = screenHeight * (0.7 + Math.random() * 0.8); // 0.7-1.5 screen heights ahead
                worldPos = {
                    x: playerWorldPos.x + (Math.random() * screenWidth * 0.8 - screenWidth * 0.4), // Random X across view
                    y: playerWorldPos.y + distanceAhead // Ahead of player (higher Y value)
                };
                break;
                
            case AISkierType.HORIZONTAL:
                // Spawn on either side of the screen to cross horizontally
                const side = Math.random() > 0.5 ? 1 : -1; // Left or right side
                worldPos = {
                    x: playerWorldPos.x + (side * screenWidth * 0.6), // Start outside view on either side
                    y: playerWorldPos.y + (screenHeight * 0.3 * (Math.random() - 0.5)) // Near player's vertical position
                };
                break;
                
            default:
                // Fallback position just in case
                worldPos = {
                    x: playerWorldPos.x + (Math.random() * screenWidth - screenWidth / 2),
                    y: playerWorldPos.y + screenHeight * 0.5
                };
        }

        // Spawn the AI skier with the calculated position and type
        this.spawnAISkier(worldPos, aiType);
    }

    /**
     * Spawns an AI skier at the given position with the specified type
     */
    private spawnAISkier(pos: Position, type: AISkierType): void {
        // Get the player's current speed as a reference for AI skier speed
        const playerSpeed = this.game.player.getCurrentSpeed();
        
        // Create a new AI skier with an appropriate speed relative to the player
        const aiSkier = new AISkier(
            this.p,
            pos,
            type,
            this.game,
            playerSpeed, // Pass player's speed as base speed
            Math.floor(Math.random() * 3) + 1 // Random variant (1, 2, or 3)
        );
        
        // Add the AI skier to the aiSkiers collection
        this.aiSkiers.push(aiSkier);
        
        if (this.debug) {
            console.debug(`Spawned AI skier of type ${AISkierType[type]} at position (${pos.x}, ${pos.y})`);
        }
    }

    /**
     * Remove entities that are too far off-screen
     */
    private cleanupEntities(): void {
        // Get player position and screen dimensions for cleanup
        const playerY = this.game.player.worldPos.y;
        const viewDistance = this.p.height * 3; // Was 2, increased to 3 for wider visible range
        
        // Log counts before cleanup for debugging
        const beforeObstacleCount = this.staticObstacles.length;
        
        // Clean up static obstacles
        this.staticObstacles = this.staticObstacles.filter(obstacle => {
            // Distance from player to obstacle
            const distance = Math.abs(obstacle.worldPos.y - playerY);
            // Keep obstacles that are close to the player's position
            const shouldKeep = distance < viewDistance;
            
            if (!shouldKeep) {
                console.debug(`Removing obstacle ${obstacle.type} at y:${obstacle.worldPos.y.toFixed(2)}, distance:${distance.toFixed(2)}, player y:${playerY.toFixed(2)}`);
            }
            
            return shouldKeep;
        });
        
        // Log how many obstacles were removed
        if (beforeObstacleCount !== this.staticObstacles.length) {
            console.debug(`Cleanup removed ${beforeObstacleCount - this.staticObstacles.length} obstacles. ${this.staticObstacles.length} remaining.`);
        }

        // Clean up AI skiers using the same view distance
        this.aiSkiers = this.aiSkiers.filter(skier => {
            // Keep skiers that are close to the player's position
            return Math.abs(skier.worldPos.y - playerY) < viewDistance;
        });
    }

    /**
     * Spawn a new obstacle at a random position
     */
    private spawnObstacle(): void {
        if (!this.atlasLoaded) {
            console.debug("Obstacle atlas not loaded yet, can't spawn obstacles");
            return;
        }

        // Get obstacle atlas from game
        const obstacleAtlas = this.game.spriteAtlases.get('obstacles');
        if (!obstacleAtlas || !obstacleAtlas.isLoaded()) {
            console.error("Obstacle atlas not available for spawning obstacles");
            return;
        }

        // Get the player's position
        const playerWorldPos = this.game.player.worldPos;

        // Calculate a random position within the viewport, but AHEAD of the player
        const screenWidth = this.p.width;
        const screenHeight = this.p.height;

        // Calculate a position ahead of the player (AHEAD = BELOW = HIGHER Y VALUE)
        // x is random across the width, y is ahead of the player, in world coordinates
        const worldPosX = playerWorldPos.x + (Math.random() * screenWidth - screenWidth / 2);
        
        // Place obstacles ahead of the player (0.5-1.5 screen heights BELOW the player)
        // This gives the player time to see and react to them
        const distanceAhead = screenHeight * (0.5 + Math.random());
        const worldPosY = playerWorldPos.y + distanceAhead; // ADD to player Y to place BELOW the player

        const worldPos = { x: worldPosX, y: worldPosY };

        // Choose a random obstacle type
        const typeIndex = Math.floor(Math.random() * this.obstacleTypes.length);
        const type = this.obstacleTypes[typeIndex];

        // Get sprite for this obstacle type from atlas
        const spriteName = `${type}.png`;
        const sprite = obstacleAtlas.getSprite(spriteName);

        if (!sprite) {
            console.error(`Could not find sprite for obstacle type: ${type}`);
            return;
        }

        // Create the obstacle using the Obstacle class
        const obstacle = new Obstacle(worldPos, type, sprite);

        // Add to obstacles array
        this.staticObstacles.push(obstacle);
        
        // Debug logging
        console.debug(`Spawned ${type} obstacle at x:${worldPos.x.toFixed(2)}, y:${worldPos.y.toFixed(2)}, player y:${playerWorldPos.y.toFixed(2)}, distance ahead: ${(worldPos.y - playerWorldPos.y).toFixed(2)}`);
        console.debug(`Total obstacles: ${this.staticObstacles.length}`);
    }

    /**
     * Toggle debug mode
     */
    public toggleDebug(): void {
        this.debug = !this.debug;
    }

    /**
     * Returns the number of static obstacles currently active
     */
    public getObstacleCount(): number {
        return this.staticObstacles.length;
    }

    /**
     * Returns the number of AI skiers currently active
     */
    public getAISkierCount(): number {
        return this.aiSkiers.length;
    }

    /**
     * Render all entities with proper depth sorting
     */
    public render(p: p5, game: Game): void {
        // Sort all entities by Y position for proper depth rendering
        const allEntities: GameEntity[] = [...this.staticObstacles, ...this.aiSkiers];

        // Sort entities by Y position (entities with smaller Y render first - appear behind)
        allEntities.sort((a, b) => a.worldPos.y - b.worldPos.y);

        // Render all entities
        for (const entity of allEntities) {
            entity.render(p, game);
        }
    }

    /**
     * Get collision hitbox for a specific entity
     */
    public getCollisionHitboxForEntity(entity: GameEntity): CollisionHitbox {
        // Entities now handle their own collision hitboxes
        return entity.getCollisionHitbox();
    }
}
