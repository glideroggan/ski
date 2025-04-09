// import { Game } from "./game";
// import { Obstacle, ObstacleManager } from "./obstacleManager";
// import { Player } from "./player/player";
// import { Position } from "./camera";
// import { AISkier } from "./aiSkier"; // Import AISkier class

// export class CollisionHandler {
//     constructor(private game: Game) {}

//     update(player: Player, obstacles: Obstacle[]) {
//         // Skip collision detection if player is already in collision state
//         if (player.isInCollisionState()) {
//             return;
//         }

//         // Get player's adjusted collision hitbox
//         const playerHitbox = player.getCollisionHitbox();
        
//         // Check for collisions with each obstacle
//         for (const obstacle of obstacles) {
//             // Get obstacle's adjusted collision hitbox
//             const obstacleHitbox = this.game.obstacleManager.getObstacleHitbox(obstacle);
            
//             // Check for collision using AABB (Axis-Aligned Bounding Box) intersection
//             if (this.checkRectIntersection(
//                 playerHitbox.position, playerHitbox.width, playerHitbox.height,
//                 obstacleHitbox.position, obstacleHitbox.width, obstacleHitbox.height
//             )) {
//                 // Collision detected! Notify player
//                 player.handleCollision(obstacle);
                
//                 // If the obstacle is an AI skier, make it crash too
//                 if (obstacle.type === 'aiSkier') {
//                     const aiSkier = obstacle as AISkier;
//                     aiSkier.crash();
//                 }
                
//                 // For debugging
//                 if (this.game.debug) {
//                     console.debug(`Collision detected with ${obstacle.type} at world position (${Math.round(obstacle.worldPos.x)}, ${Math.round(obstacle.worldPos.y)})`);
//                 }
                
//                 // Only handle one collision at a time
//                 return;
//             }
//         }
        
//         // Check for collisions between AI skiers and other obstacles
//         this.checkAISkierCollisions(obstacles);
//     }
    
//     // Helper method to check if two rectangles intersect
//     private checkRectIntersection(
//         pos1: Position, width1: number, height1: number,
//         pos2: Position, width2: number, height2: number
//     ): boolean {
//         // Calculate rectangle boundaries
//         const rect1Left = pos1.x - width1 / 2;
//         const rect1Right = pos1.x + width1 / 2;
//         const rect1Top = pos1.y - height1 / 2;
//         const rect1Bottom = pos1.y + height1 / 2;
        
//         const rect2Left = pos2.x - width2 / 2;
//         const rect2Right = pos2.x + width2 / 2;
//         const rect2Top = pos2.y - height2 / 2;
//         const rect2Bottom = pos2.y + height2 / 2;
        
//         // Check for intersection
//         return (
//             rect1Right > rect2Left &&
//             rect1Left < rect2Right &&
//             rect1Bottom > rect2Top &&
//             rect1Top < rect2Bottom
//         );
//     }
    
//     // Helper method to check for collisions between AI skiers and other obstacles
//     private checkAISkierCollisions(obstacles: Obstacle[]): void {
//         // For each AI skier
//         for (let i = 0; i < obstacles.length; i++) {
//             const obstacle1 = obstacles[i];
            
//             // Skip if not an AI skier or already crashed
//             if (obstacle1.type !== 'aiSkier' || (obstacle1 as AISkier).currentState === 5) { // 5 is AISkierState.CRASHED
//                 continue;
//             }
            
//             const aiSkier = obstacle1 as AISkier;
//             const aiSkierHitbox = this.game.obstacleManager.getObstacleHitbox(aiSkier);
            
//             // Check against all other obstacles
//             for (let j = 0; j < obstacles.length; j++) {
//                 // Skip self-collision check
//                 if (i === j) continue;
                
//                 const obstacle2 = obstacles[j];
                
//                 // Skip collision check with other AI skiers (optional)
//                 if (obstacle2.type === 'aiSkier') continue;
                
//                 const obstacleHitbox = this.game.obstacleManager.getObstacleHitbox(obstacle2);
                
//                 // Check for collision
//                 if (this.checkRectIntersection(
//                     aiSkierHitbox.position, aiSkierHitbox.width, aiSkierHitbox.height,
//                     obstacleHitbox.position, obstacleHitbox.width, obstacleHitbox.height
//                 )) {
//                     // AI skier collided with an obstacle
//                     aiSkier.crash();
                    
//                     if (this.game.debug) {
//                         console.debug(`AI skier collided with ${obstacle2.type} at (${Math.round(obstacle2.worldPos.x)}, ${Math.round(obstacle2.worldPos.y)})`);
//                     }
                    
//                     // Once crashed, no need to check other obstacles
//                     break;
//                 }
//             }
//         }
//     }
    
//     // Method to draw debug visualization for collision detection
//     public renderDebug(): void {
//         if (!this.game.debug) return;
        
//         // Nothing to render here as hitboxes are now drawn by the respective entities
//         // We could add additional collision-specific debugging here if needed
//     }
// }