import { Game } from "../game";
import { ICollidable, CollisionHitbox } from "./ICollidable";
import { SkierEntity } from "../skier/skier.entity";

export class CollisionSystem {
    constructor(private game: Game) {}

    update(collidables: ICollidable[]) {
        // For each collidable object, check collisions with all others
        for (let i = 0; i < collidables.length; i++) {
            const entity1 = collidables[i];
            
            // Skip if this entity is already handling a collision
            if (this.isInCollisionState(entity1)) {
                continue;
            }
            
            // Get collision hitbox for this entity
            const hitbox1 = entity1.getCollisionHitbox();
            
            // Check against all other entities
            for (let j = 0; j < collidables.length; j++) {
                // Skip self-collision check
                if (i === j) continue;
                
                const entity2 = collidables[j];
                const hitbox2 = entity2.getCollisionHitbox();
                
                // Check for collision using AABB intersection
                if (this.checkRectIntersection(hitbox1, hitbox2)) {
                    // Collision detected! Notify both entities
                    entity1.handleCollision(entity2);
                    
                    // For debugging
                    if (this.game.debug) {
                        console.debug(`Collision detected: ${entity1.type} collided with ${entity2.type} at world position (${Math.round(entity2.worldPos.x)}, ${Math.round(entity2.worldPos.y)})`);
                    }
                    
                    // Only handle one collision per entity per frame
                    break;
                }
            }
        }
    }
      // Helper method to check if an entity is already handling a collision
    private isInCollisionState(entity: ICollidable): boolean {
        // Check if this is a SkierEntity (either Player or AISkier)
        if (entity instanceof SkierEntity) {
            // If the entity is already flying due to a snowdrift jump,
            // we want to allow passing through other obstacles - this creates
            // a more enjoyable gameplay when jumping over obstacles
            if (entity.isFlying()) {
                // Check if this flying state was just triggered by a snowdrift
                // to avoid potential issues with jump mechanics
                return true;
            }
            
            return entity.isInCollisionState();
        }
        
        // Default for other entity types (trees, rocks, etc.)
        return false;
    }
    
    // Helper method to check if two rectangles intersect using their hitboxes
    private checkRectIntersection(hitbox1: CollisionHitbox, hitbox2: CollisionHitbox): boolean {
        // Calculate rectangle boundaries
        const rect1Left = hitbox1.position.x - hitbox1.width / 2;
        const rect1Right = hitbox1.position.x + hitbox1.width / 2;
        const rect1Top = hitbox1.position.y - hitbox1.height / 2;
        const rect1Bottom = hitbox1.position.y + hitbox1.height / 2;
        
        const rect2Left = hitbox2.position.x - hitbox2.width / 2;
        const rect2Right = hitbox2.position.x + hitbox2.width / 2;
        const rect2Top = hitbox2.position.y - hitbox2.height / 2;
        const rect2Bottom = hitbox2.position.y + hitbox2.height / 2;
        
        // Check for intersection
        return (
            rect1Right > rect2Left &&
            rect1Left < rect2Right &&
            rect1Bottom > rect2Top &&
            rect1Top < rect2Bottom
        );
    }
    
    // Method to draw debug visualization for collision detection
    public renderDebug(): void {
        if (!this.game.debug) return;
        
        // Nothing to render here as hitboxes are now drawn by the respective entities
    }
}
