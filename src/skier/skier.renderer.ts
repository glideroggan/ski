import p5 from 'p5';
import { SkierData, SkierEntity, SkierState } from './skier.entity';
import { Game } from '../game';
import { Sprite } from '../sprite';
import { Position } from '../camera';

/**
 * Shared renderer for all skier entities
 */
export class SkierRenderer {
    private skierData: SkierData;

    constructor(skierData: SkierData, private main: SkierEntity) {
        this.skierData = skierData;
    }

    public getGroundY(screenPos: Position, sprite: Sprite): number {
        return screenPos.y + (sprite.spriteHeight * sprite.getScale() / 2) * .2;
    }
    public getVisualY(screenPos: Position): number {
        return screenPos.y - (this.skierData.zAxis * 20);
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
            console.warn(`Sprite not found for state ${SkierState[this.skierData.currentState]}`);
            return;
        }

        // Create a flag to track if we've pushed the collision effect state
        let collisionEffectPushed = false;

        // Apply visual effect if collision is active
        if (this.skierData.collisionEffectTimer > 0) {
            p.push();
            collisionEffectPushed = true;

            if (this.skierData.collisionEffectTimer % 4 < 2) { // Flashing effect
                p.tint(255, 100, 100); // Red tint
            }
            // Add slight random offset for shake effect
            const shakeAmount = this.skierData.collisionEffectTimer / 5;
            p.translate(
                p.random(-shakeAmount, shakeAmount),
                p.random(-shakeAmount, shakeAmount)
            );
        }

        // Get screen position from world position using camera transformation
        const screenPos = game.camera.worldToScreen(this.skierData.worldPos);

        // Calculate height above ground for visual effects
        let heightAboveGround = this.skierData.zAxis;
        heightAboveGround = heightAboveGround * 20

        // Center the sprite on the skier's position
        let x = screenPos.x;
        let groundedY = this.getGroundY(screenPos, sprite);
        let visualY = this.getVisualY(screenPos);

        // console.debug(`[renderer] Height above ground: ${heightAboveGround}, Skier Y: ${y}`);

        p.push();
        // Draw an oval shadow on the ground (without the height adjustment)
        const shadowY = groundedY; // Shadow is at ground level
        const shadowWidth = this.skierData.width * 0.7; // Narrower than the skier
        const shadowHeight = this.skierData.height * 0.2; // Flatter than the skier

        // Adjust shadow opacity based on height - higher means more transparent shadow
        const shadowOpacity = Math.max(20, Math.min(50, 150 - heightAboveGround * 3));

        p.noStroke();
        p.fill(0, 0, 0, shadowOpacity);
        p.ellipse(x, shadowY, shadowWidth, shadowHeight);
        p.pop();

        p.push();

        // Apply terrain rotation if not flying or crashed
        const isCrashed = this.skierData.currentState === SkierState.CRASHED;
        const isFlying = this.main.isFlying();

        if (!isFlying && !isCrashed) {
            // Translate to the sprite's position, rotate, then draw
            p.translate(screenPos.x, visualY);
            p.rotate(this.skierData.currentRotation);

            // Render the sprite at the origin (0,0) since we've translated to its position
            sprite.render(0, 0, this.skierData.width, this.skierData.height);
        } else {
            // Draw normally without rotation
            p.translate(screenPos.x, visualY);
            sprite.render(0, 0, this.skierData.width, this.skierData.height);
        }

        p.pop();

        // Only pop if we pushed for collision effect
        if (collisionEffectPushed) {
            p.pop(); // Restore drawing state (for collision effect)
        }

        // render center of sprite (debug)
        if (this.skierData.debug) {
            p.fill(0, 255, 0);
            p.noStroke();
            p.circle(screenPos.x, screenPos.y, 5); // Draw a small circle at the skier's position
        }


        // Render debug hitbox if debug mode is enabled
        this.renderDebugHitbox(p, game);
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

        // Display height above ground in debug mode
        if (this.skierData.debug) {
            const heightAboveGround = this.skierData.zAxis - this.skierData.groundLevel;
            p.fill(255);
            p.noStroke();
            p.textSize(10);
            p.text(`Height: ${heightAboveGround.toFixed(1)}`, screenPos.x + 15, screenPos.y - 5);
            p.text(`Ground: ${this.skierData.isGrounded ? 'Yes' : 'No'}`, screenPos.x + 15, screenPos.y + 10);
        }
    }
}
