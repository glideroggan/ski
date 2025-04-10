import { Position } from '../camera';

/**
 * Interface for objects that can participate in collision detection
 */
export interface ICollidable {  // The world position of the collidable object
  worldPos: Position;
  
  // The width and height for collision detection
  width: number;
  height: number;
  
  // Type identifier for the object (using union type for better type safety)
  type: 'player' | 'aiSkier' | 'tree' | 'rock' | 'snowman' | 'snowdrift';
  
  /**
   * Gets the collision hitbox for this entity.
   * This allows entities to define custom collision areas.
   */
  getCollisionHitbox(): CollisionHitbox;
  
  /**
   * Handle being collided with by another entity
   * @param other The entity that collided with this one
   */
  handleCollision(other: ICollidable): void;
}

/**
 * Represents a collision hitbox with position and dimensions
 */
export interface CollisionHitbox {
  position: Position;
  width: number;
  height: number;
}
