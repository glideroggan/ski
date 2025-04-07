import { PlayerRenderData, PlayerState } from "./player";

export class PlayerRenderer {
    private playerData: PlayerRenderData;

    constructor(playerData: PlayerRenderData) {
        this.playerData = playerData;
    }

    // Method to update render data from player
    public updateRenderData(newData: PlayerRenderData): void {
        this.playerData = newData;
    }

    render(): void {
        // Changed condition to only check if sprites are available
        // We don't need spriteSheet directly when using sprites from an atlas
        if (!this.playerData.assetsLoaded || this.playerData.sprites.size === 0) {
            // Log debug info about asset loading state
            console.warn(`Assets loaded: ${this.playerData.assetsLoaded}, Sprites available: ${this.playerData.sprites.size}, SpriteSheet: ${this.playerData.spriteSheet}`);
            console.warn("Assets not loaded or no sprites available for rendering.");
            return;
        }

        const sprite = this.playerData.sprites.get(this.playerData.currentState);
        if (!sprite) {
            // Skip rendering if sprite isn't available
            console.warn(`Sprite not found for state ${PlayerState[this.playerData.currentState]}`);
            return;
        }

        // Apply visual effect if collision is active
        if (this.playerData.collisionEffect > 0) {
            this.playerData.p.push();
            if (this.playerData.collisionEffect % 4 < 2) { // Flashing effect
                this.playerData.p.tint(255, 100, 100); // Red tint
            }
            // Add slight random offset for shake effect
            const shakeAmount = this.playerData.collisionEffect / 5;
            this.playerData.p.translate(
                this.playerData.p.random(-shakeAmount, shakeAmount),
                this.playerData.p.random(-shakeAmount, shakeAmount)
            );
        }

        // Get screen position from world position using camera transformation
        const screenPos = this.playerData.game.camera.worldToScreen(this.playerData.worldPos);

        // Center the sprite on the player's position
        let x = screenPos.x;
        let y = screenPos.y;

        // Apply terrain height adjustment using pre-calculated smooth height
        if (this.playerData.useTerrainHeight) {
            y -= this.playerData.currentVisualHeight;
        }

        this.playerData.p.push(); // Save current transformation state

        // Apply terrain-based rotation using pre-calculated smooth rotation
        if (this.playerData.useTerrainRotation && !this.playerData.isFlying() && !this.playerData.isCrashed()) {
            // Apply rotation based on pre-calculated smooth rotation
            // Translate to player position, rotate, then translate back
            this.playerData.p.translate(x, y);
            this.playerData.p.rotate(this.playerData.currentRotation);
            this.playerData.p.translate(-x, -y);
        }

        // Render the sprite
        sprite.render(x, y, this.playerData.width, this.playerData.height);

        this.playerData.p.pop(); // Restore transformation state

        if (this.playerData.collisionEffect > 0) {
            this.playerData.p.pop(); // Restore drawing state (for collision effect)
        }

        // Render debug hitbox if debug mode is enabled
        this.renderDebugHitbox();

        // Debug visualization for terrain height adjustment
        if (this.playerData.debug) {
            const terrainHeight = this.playerData.game.world.getHeightAtPosition(this.playerData.worldPos);
            const slope = this.playerData.game.world.getSlopeAtPosition(this.playerData.worldPos);

            // Draw a line showing the height adjustment
            this.playerData.p.stroke(0, 255, 0);
            this.playerData.p.line(x, y, x, screenPos.y);

            // Draw a line showing slope direction
            this.playerData.p.stroke(255, 0, 0);
            const slopeLength = 20;
            this.playerData.p.line(
                x,
                y,
                x + Math.cos(this.playerData.currentRotation / this.playerData.terrainRotationFactor) * slopeLength,
                y + Math.sin(this.playerData.currentRotation / this.playerData.terrainRotationFactor) * slopeLength
            );

            // Display smoothed height value
            this.playerData.p.fill(255, 255, 0);
            this.playerData.p.noStroke();
            this.playerData.p.text(`Visual Height: ${this.playerData.currentVisualHeight.toFixed(2)}`, 10, 210);
            this.playerData.p.text(`Visual Rotation: ${(this.playerData.currentRotation * 180 / Math.PI).toFixed(2)}°`, 10, 230);
        }
    }

    /**
     * Renders the debug hitbox for the player
     */
    renderDebugHitbox(): void {
        if (!this.playerData.debug) return;

        const hitbox = this.playerData.getCollisionHitbox();
        const screenPos = this.playerData.game.camera.worldToScreen(hitbox.position);

        // Draw player position indicator
        this.playerData.p.noFill();
        this.playerData.p.stroke(0, 255, 0);
        this.playerData.p.circle(screenPos.x, screenPos.y, 10);

        // Draw hitbox
        this.playerData.p.stroke(255, 0, 0);
        this.playerData.p.rect(
            screenPos.x - hitbox.width / 2,
            screenPos.y - hitbox.height / 2,
            hitbox.width,
            hitbox.height
        );
    }
}