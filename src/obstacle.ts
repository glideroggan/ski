// src/obstacles/obstacle.ts
import p5 from 'p5';
import { Game, RenderableObject } from './game';
import { CollisionHitbox, ICollidable } from './collision/ICollidable';
import { Position } from './camera';
import { Sprite } from './sprite';

export type ObstacleType = 'tree' | 'rock' | 'snowman';

export class Obstacle implements RenderableObject, ICollidable {
    public worldPos: Position;
    public width: number;
    public height: number;
    public type: ObstacleType;
    public sprite: Sprite | null;
    
    // Configuration for each obstacle type - adjusted to better match actual sprite sizes
    private static typeConfig = {
        'tree': { 
            width: 100, 
            height: 150, 
            hitbox: { 
                xOffset: 0, 
                yOffset: 50, 
                widthFactor: 0.3, 
                heightFactor: 0.2 
            } 
        },
        'rock': { 
            width: 120, 
            height: 80, 
            hitbox: { 
                xOffset: 0, 
                yOffset: 10, 
                widthFactor: 0.8, 
                heightFactor: 0.5 
            } 
        },
        'snowman': { 
            width: 50, 
            height: 90, 
            hitbox: { 
                xOffset: 0, 
                yOffset: 20, 
                widthFactor: 0.7, 
                heightFactor: 0.4 
            } 
        }
    };

    constructor(position: Position, type: ObstacleType, sprite: Sprite | null) {
        this.worldPos = position;
        this.type = type;
        this.sprite = sprite;
        
        // Set dimensions based on type
        const config = Obstacle.typeConfig[this.type];
        this.width = config.width;
        this.height = config.height;
    }

    public render(p: p5, game: Game): void {
        // Convert world position to screen position
        const screenPos = game.camera.worldToScreen(this.worldPos);

        // Render the sprite
        if (this.sprite) {
            this.sprite.render(screenPos.x, screenPos.y, this.width, this.height);
        } else {
            // Fallback rendering if sprite is missing
            p.push();
            
            // Set colors based on obstacle type
            switch(this.type) {
                case 'tree':
                    p.fill(0, 100, 0);  // Dark green
                    break;
                case 'rock':
                    p.fill(100, 100, 100);  // Gray
                    break;
                case 'snowman':
                    p.fill(200, 200, 200);  // Light gray
                    break;
                default:
                    p.fill(255, 0, 255);  // Magenta for unknown types
                    break;
            }
            
            // Draw a rectangle as fallback
            p.rect(
                screenPos.x - this.width / 2,
                screenPos.y - this.height / 2,
                this.width,
                this.height
            );
            
            // Add text label
            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(this.type, screenPos.x, screenPos.y);
            
            p.pop();
            
            console.warn(`Using fallback rendering for ${this.type} - sprite missing`);
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
    }

    public update(): void {
        // Obstacles are static in world space
        // Their apparent movement is handled by the camera's worldToScreen translation
        // No position updates needed
        
        // Note: If we need to apply special effects or animations to obstacles,
        // we can add that logic here, but we don't change their world position
    }

    public getCollisionHitbox(): CollisionHitbox {
        const config = Obstacle.typeConfig[this.type].hitbox;
        
        // Apply obstacle-specific collision adjustments
        const adjustedPosition: Position = {
            x: this.worldPos.x + config.xOffset,
            y: this.worldPos.y + config.yOffset
        };

        const adjustedWidth = this.width * config.widthFactor;
        const adjustedHeight = this.height * config.heightFactor;

        return {
            position: adjustedPosition,
            width: adjustedWidth,
            height: adjustedHeight
        };
    }

    public handleCollision(other: ICollidable): void {
        // Static obstacles don't do anything when collided with
        console.debug(`Obstacle ${this.type} was hit by ${other.type}`);
    }
}