import p5 from 'p5';
import { Sprite } from './sprite';
import { Game, RenderableObject } from './game';
import { Position } from './camera';
import { SpriteAtlas } from './spriteAtlas';
import { AISkier, AISkierType } from './aiSkier';
import { ICollidable, CollisionHitbox } from './collision/ICollidable';

// Interface for obstacle dimensions
export interface ObstacleDimensions {
    width: number;
    height: number;
}

// Static obstacle types
export type ObstacleType = 'tree' | 'rock' | 'snowman';

// Interface for static obstacles
export interface Obstacle extends RenderableObject, ICollidable {
    worldPos: Position;
    width: number;
    height: number;
    type: ObstacleType;
    sprite: Sprite | null;
    render(p: p5, game: Game): void;
    update(scrollSpeed: number, horizontalOffset: number): void;
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
     * Update all entities
     */
    public update(game: Game): void {
        const scrollSpeed = this.game.difficultyManager.getPlayerSpeed();

        // Handle static obstacle spawning and lifecycle
        this.updateObstacles(scrollSpeed);

        // Handle AI skier spawning and lifecycle
        this.updateAISkiers();

        // Remove entities that are too far off-screen
        this.cleanupEntities();
    }

    /**
     * Update obstacle spawning and movement
     */
    private updateObstacles(scrollSpeed: number): void {
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

        // Update existing obstacles
        for (const obstacle of this.staticObstacles) {
            obstacle.update(scrollSpeed, 0);
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
            this.spawnAISkier();
            this.aiSkierSpawnTimer = 0;
        }

        // Update existing AI skiers
        const scrollSpeed = this.game.difficultyManager.getPlayerSpeed();
        for (const aiSkier of this.aiSkiers) {
            aiSkier.update(scrollSpeed, 0);
        }
    }

    /**
     * Remove entities that are too far off-screen
     */
    private cleanupEntities(): void {
        // Filter out obstacles that are too far behind or ahead of the player
        const playerY = this.game.player.worldPos.y;
        const viewDistance = this.p.height * 2; // Twice the screen height

        // Clean up static obstacles
        this.staticObstacles = this.staticObstacles.filter(obstacle => {
            // Keep obstacles that are close to the player's position
            return Math.abs(obstacle.worldPos.y - playerY) < viewDistance;
        });

        // Clean up AI skiers
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

        // Calculate a random position within the viewport, but ahead of the player
        const screenWidth = this.p.width;
        const screenHeight = this.p.height;

        // Calculate a position ahead of the player
        // x is random across the width, y is ahead of the player, in world coordinates
        const worldPosX = playerWorldPos.x + (Math.random() * screenWidth - screenWidth / 2);
        const worldPosY = playerWorldPos.y - screenHeight / 2 - Math.random() * screenHeight / 2;

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

        // Get the dimensions for this obstacle type
        const width = type === 'tree' ? 40 : type === 'rock' ? 50 : 30;
        const height = type === 'tree' ? 80 : type === 'rock' ? 40 : 60;

        // Create the obstacle object
        // TODO: shouldn't this be its own class? or does it need
        const obstacle: Obstacle = {
            worldPos,
            width,
            height,
            type: type as ObstacleType,
            sprite,

            render: function (p: p5, game: Game): void {
                // Convert world position to screen position
                const screenPos = game.camera.worldToScreen(this.worldPos);

                // Don't render if off-screen
                if (
                    screenPos.x < -this.width ||
                    screenPos.x > p.width + this.width ||
                    screenPos.y < -this.height ||
                    screenPos.y > p.height + this.height
                ) {
                    return;
                }

                // Render the sprite
                if (this.sprite) {
                    this.sprite.render(screenPos.x, screenPos.y, this.width, this.height);
                }

                // Debug rendering
                if (game.debug) {
                    // Draw the collision hitbox
                    const hitbox = this.getCollisionHitbox();
                    const hitboxScreenPos = game.camera.worldToScreen(hitbox.position);

                    p.push();
                    p.noFill();
                    p.stroke(255, 0, 0);
                    p.rect(
                        hitboxScreenPos.x - hitbox.width / 2,
                        hitboxScreenPos.y - hitbox.height / 2,
                        hitbox.width,
                        hitbox.height
                    );
                    p.pop();
                }
            },

            update: function (scrollSpeed: number, horizontalOffset: number): void {
                // Move the obstacle based on scroll speed
                this.worldPos.y += scrollSpeed;

                // Apply any horizontal offset
                if (horizontalOffset !== 0) {
                    this.worldPos.x += horizontalOffset;
                }
            }, getCollisionHitbox: function (): CollisionHitbox {
                // Store collision adjustment locally in each obstacle, avoiding circular reference
                // This is the default if no specific adjustment exists for this type
                const defaultAdjustment = { xOffset: 0, yOffset: 0, widthFactor: 1, heightFactor: 1 };

                // Static reference to the adjustment values based on obstacle type
                const adjustmentMap = {
                    'tree': { xOffset: 0, yOffset: 30, widthFactor: 0.3, heightFactor: 0.2 },
                    'rock': { xOffset: 0, yOffset: 5, widthFactor: 0.8, heightFactor: 0.5 },
                    'snowman': { xOffset: 0, yOffset: 10, widthFactor: 0.7, heightFactor: 0.4 }
                };

                const adjustment = adjustmentMap[this.type] || defaultAdjustment;

                // Apply obstacle-specific collision adjustments
                const adjustedPosition: Position = {
                    x: this.worldPos.x + adjustment.xOffset,
                    y: this.worldPos.y + adjustment.yOffset
                };

                const adjustedWidth = this.width * adjustment.widthFactor;
                const adjustedHeight = this.height * adjustment.heightFactor;

                return {
                    position: adjustedPosition,
                    width: adjustedWidth,
                    height: adjustedHeight
                };
            },

            handleCollision: function (other: ICollidable): void {
                // Static obstacles don't do anything when collided with
                if (game.debug) {
                    console.debug(`Obstacle ${this.type} was hit by ${other.type}`);
                }
            }
        };

        // Add to obstacles array
        this.staticObstacles.push(obstacle);
    }

    /**
     * Spawn a new AI skier
     */
    private spawnAISkier(): void {
        // Get player position
        const playerWorldPos = this.game.player.worldPos;

        // Calculate a position relative to the player
        const screenWidth = this.p.width;
        const screenHeight = this.p.height;

        // Determine AI skier type with probabilities
        let skierType: AISkierType;
        const randomValue = Math.random();

        if (randomValue < 0.3) {
            // 30% chance for horizontal skier
            skierType = AISkierType.HORIZONTAL;
        } else if (randomValue < 0.6) {
            // 30% chance for fast vertical skier (overtakes player)
            skierType = AISkierType.FAST_VERTICAL;
        } else {
            // 40% chance for slow vertical skier (gets passed by player)
            skierType = AISkierType.SLOW_VERTICAL;
        }

        let worldPosX, worldPosY;

        // Different spawn positions based on skier type
        if (skierType === AISkierType.HORIZONTAL) {
            // Spawn on either side of the screen
            worldPosX = playerWorldPos.x + (Math.random() > 0.5 ? -screenWidth : screenWidth);
            // Somewhere ahead of the player, within the visible area
            worldPosY = playerWorldPos.y - Math.random() * screenHeight * 0.8;
        } else if (skierType === AISkierType.FAST_VERTICAL) {
            // Random X position across the width, slightly offset from center
            worldPosX = playerWorldPos.x + (Math.random() * screenWidth - screenWidth / 2) * 0.7;
            // Behind the player, barely visible at the bottom of the screen
            worldPosY = playerWorldPos.y + screenHeight * 0.8;
        } else {
            // Random X position across the width, slightly offset from center
            worldPosX = playerWorldPos.x + (Math.random() * screenWidth - screenWidth / 2) * 0.7;
            // Ahead of the player, near the top of the screen
            worldPosY = playerWorldPos.y - screenHeight * 0.8;
        }

        // Determine the AI skier speed based on type and difficulty
        const basePlayerSpeed = this.game.difficultyManager.getPlayerSpeed();
        let aiSpeed: number;

        if (skierType === AISkierType.FAST_VERTICAL) {
            // Faster than the player
            aiSpeed = basePlayerSpeed * 1.3;
        } else if (skierType === AISkierType.SLOW_VERTICAL) {
            // Slower than the player
            aiSpeed = basePlayerSpeed * 0.7;
        } else {
            // Horizontal skiers move at a medium speed
            aiSpeed = basePlayerSpeed;
        }

        // Choose a random skier variant (1, 2, or 3)
        // Use variant 1 less often since that's the player's variant
        const variantType = Math.random() < 0.2 ? 1 : (Math.random() < 0.5 ? 2 : 3);

        // Create the AI skier
        const aiSkier = new AISkier(
            { x: worldPosX, y: worldPosY },
            skierType,
            this.game,
            aiSpeed,
            variantType
        );

        // Add to AI skiers array
        this.aiSkiers.push(aiSkier);
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
    public getCollisionHitboxForEntity(entity: Obstacle): CollisionHitbox {
        // Get the defined collision adjustment for this obstacle type
        const adjustment = this.collisionAdjustments.get(entity.type) ||
            { xOffset: 0, yOffset: 0, widthFactor: 1, heightFactor: 1 };

        // Apply obstacle-specific collision adjustments
        const adjustedPosition: Position = {
            x: entity.worldPos.x + adjustment.xOffset,
            y: entity.worldPos.y + adjustment.yOffset
        };

        const adjustedWidth = entity.width * adjustment.widthFactor;
        const adjustedHeight = entity.height * adjustment.heightFactor;

        return {
            position: adjustedPosition,
            width: adjustedWidth,
            height: adjustedHeight
        };
    }
}
