import p5 from 'p5';
import { SkierData, SkierState } from './skier.entity';
import { Game } from '../game';

/**
 * Shared renderer for all skier entities
 */
export class SkierRenderer {
    private skierData: SkierData;

    constructor(skierData: SkierData) {
        this.skierData = skierData;
    }

    render(p: p5, game: Game): void {
        // We no longer render ski tracks here - they are rendered separately
        // before all dynamic objects in the game's renderAllSkiTracks method
        
        if (!this.skierData.assetsLoaded || this.skierData.sprites.size === 0) {
            // Skip rendering if assets aren't loaded
            return;
        }

        const sprite = this.skierData.sprites.get(this.skierData.currentState);
        if (!sprite) {
            return;
        }

        // Create a flag to track if we've pushed the collision effect state
        let collisionEffectPushed = false;
        
        // Apply visual effect if collision is active
        if (this.skierData.collisionEffect > 0) {
            p.push();
            collisionEffectPushed = true;
            
            if (this.skierData.collisionEffect % 4 < 2) { // Flashing effect
                p.tint(255, 100, 100); // Red tint
            }
            // Add slight random offset for shake effect
            const shakeAmount = this.skierData.collisionEffect / 5;
            p.translate(
                p.random(-shakeAmount, shakeAmount),
                p.random(-shakeAmount, shakeAmount)
            );
        }

        // Get screen position from world position using camera transformation
        const screenPos = game.camera.worldToScreen(this.skierData.worldPos);

        // Center the sprite on the skier's position
        let x = screenPos.x;
        let y = screenPos.y;

        // Apply terrain height adjustment
        y -= this.skierData.currentVisualHeight;

        p.push();
        
        // Apply terrain rotation if not flying or crashed
        const isFlying = this.isInFlyingState(this.skierData.currentState);
        const isCrashed = this.skierData.currentState === SkierState.CRASHED;
        
        if (!isFlying && !isCrashed) {
            // Translate to the sprite's position, rotate, then draw
            p.translate(x, y);
            p.rotate(this.skierData.currentRotation);
            
            // Render the sprite at the origin (0,0) since we've translated to its position
            sprite.render(0, 0, this.skierData.width, this.skierData.height);
        } else {
            // Draw normally without rotation
            sprite.render(x, y, this.skierData.width, this.skierData.height);
        }
        
        p.pop();

        // Only pop if we pushed for collision effect
        if (collisionEffectPushed) {
            p.pop(); // Restore drawing state (for collision effect)
        }

        // Render debug hitbox if debug mode is enabled
        this.renderDebugHitbox(p, game);

        // Debug visualization for terrain height adjustment and sprite rotation
        if (this.skierData.debug) {
            const terrainHeight = game.world.getHeightAtPosition(this.skierData.worldPos);
            const slope = game.world.getSlopeAtPosition(this.skierData.worldPos);

            // Draw a line showing the height adjustment
            p.stroke(0, 255, 0);
            p.line(x, y, x, screenPos.y);

            // Draw a line showing slope direction
            p.stroke(255, 0, 0);
            const slopeLength = 20;
            p.line(
                x,
                y,
                x + Math.cos(this.skierData.currentRotation) * slopeLength,
                y + Math.sin(this.skierData.currentRotation) * slopeLength
            );

            // Display debug values
            p.fill(255, 255, 0);
            p.noStroke();
            p.text(`Visual Height: ${this.skierData.currentVisualHeight.toFixed(2)}`, 10, 210);
            p.text(`Visual Rotation: ${(this.skierData.currentRotation * 180 / Math.PI).toFixed(2)}°`, 10, 230);
            
            // Show terrain bumpiness info
            p.fill(0, 255, 255);
            p.text(`Terrain bumpy: ${terrainHeight.toFixed(3)}`, 10, 250);
            p.text(`Slope angle: ${(slope.angle * 180 / Math.PI).toFixed(1)}°`, 10, 270);
            
            // Show track info
            p.fill(255, 200, 200);
            p.text(`Track points: ${this.skierData.skiTrack.getPointCount()}`, 200, 210);
        }
    }

    /**
     * Renders the debug hitbox for the skier
     */
    private renderDebugHitbox(p: p5, game: Game): void {
        if (!this.skierData.debug) return;

        const hitbox = this.skierData.getCollisionHitbox();
        const screenPos = game.camera.worldToScreen(hitbox.position);

        // Draw skier position indicator
        p.noFill();
        p.stroke(0, 255, 0);
        p.circle(screenPos.x, screenPos.y, 10);

        // Draw hitbox
        p.stroke(255, 0, 0);
        p.rect(
            screenPos.x - hitbox.width / 2,
            screenPos.y - hitbox.height / 2,
            hitbox.width,
            hitbox.height
        );
    }
    
    /**
     * Helper method to check if a state is a flying state
     */
    private isInFlyingState(state: SkierState): boolean {
        return state === SkierState.FLYING_DOWN ||
               state === SkierState.FLYING_RIGHT_DOWN ||
               state === SkierState.FLYING_RIGHT ||
               state === SkierState.FLYING_LEFT_DOWN ||
               state === SkierState.FLYING_LEFT;
    }
}
