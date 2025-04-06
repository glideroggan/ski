import { Game } from "./game";
import { Obstacle, ObstacleManager } from "./obstacleManager";
import { Player } from "./player";
import { Position } from "./camera";

export class CollisionHandler {
    constructor(private game: Game) {}

    update(player: Player, obstacles: Obstacle[]) {
        // Skip collision detection if player is already in collision state
        if (player.isInCollisionState()) {
            return;
        }

        // Get player's world position and dimensions for collision detection
        const playerPos = player.worldPos;
        const playerWidth = player.width;
        const playerHeight = player.height;
        
        // Apply player collision offset for better collision detection
        const adjustedPlayerPos: Position = {
            x: playerPos.x + player.playerCollisionOffset.xOffset,
            y: playerPos.y + player.playerCollisionOffset.yOffset
        };
        
        const adjustedPlayerWidth = playerWidth * player.playerCollisionOffset.widthFactor;
        const adjustedPlayerHeight = playerHeight * player.playerCollisionOffset.heightFactor;
        
        // Check for collisions with each obstacle
        for (const obstacle of obstacles) {
            const obstaclePos = obstacle.worldPos;
            const obstacleWidth = obstacle.width;
            const obstacleHeight = obstacle.height;
            
            // Get collision adjustment for this obstacle type from the obstacle manager
            const obstacleManager = this.game.obstacleManager;
            
            // Get the obstacle-specific collision adjustment if available
            let obstacleAdjustment;
            if (obstacleManager.collisionAdjustments && obstacleManager.collisionAdjustments.get) {
                obstacleAdjustment = obstacleManager.collisionAdjustments.get(obstacle.type);
            }
            
            // Use default if specific adjustment not found
            if (!obstacleAdjustment) {
                obstacleAdjustment = { 
                    xOffset: 0, 
                    yOffset: 0, 
                    widthFactor: 0.7, 
                    heightFactor: 0.7 
                };
            }
            
            // Apply obstacle-specific collision adjustments
            const adjustedObstaclePos: Position = {
                x: obstaclePos.x + obstacleAdjustment.xOffset,
                y: obstaclePos.y + obstacleAdjustment.yOffset
            };
            
            const adjustedObstacleWidth = obstacleWidth * obstacleAdjustment.widthFactor;
            const adjustedObstacleHeight = obstacleHeight * obstacleAdjustment.heightFactor;
            
            // Check for collision using AABB (Axis-Aligned Bounding Box) intersection
            if (this.checkRectIntersection(
                adjustedPlayerPos, adjustedPlayerWidth, adjustedPlayerHeight,
                adjustedObstaclePos, adjustedObstacleWidth, adjustedObstacleHeight
            )) {
                // Collision detected! Notify player
                player.handleCollision(obstacle);
                
                // For debugging
                if (this.game.debug) {
                    console.log(`Collision detected with ${obstacle.type} at world position (${Math.round(obstaclePos.x)}, ${Math.round(obstaclePos.y)})`);
                }
                
                // Only handle one collision at a time
                return;
            }
        }
    }
    
    // Helper method to check if two rectangles intersect
    private checkRectIntersection(
        pos1: Position, width1: number, height1: number,
        pos2: Position, width2: number, height2: number
    ): boolean {
        // Calculate rectangle boundaries
        const rect1Left = pos1.x - width1 / 2;
        const rect1Right = pos1.x + width1 / 2;
        const rect1Top = pos1.y - height1 / 2;
        const rect1Bottom = pos1.y + height1 / 2;
        
        const rect2Left = pos2.x - width2 / 2;
        const rect2Right = pos2.x + width2 / 2;
        const rect2Top = pos2.y - height2 / 2;
        const rect2Bottom = pos2.y + height2 / 2;
        
        // Check for intersection
        return (
            rect1Right > rect2Left &&
            rect1Left < rect2Right &&
            rect1Bottom > rect2Top &&
            rect1Top < rect2Bottom
        );
    }
}