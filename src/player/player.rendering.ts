import { Player, PlayerData, PlayerState } from "./player";

export class PlayerRenderer {
    private playerData: PlayerData;
    private player: Player;

    constructor(playerData: PlayerData, player: Player) {
        this.playerData = playerData;
        this.player = player;
    }

    render(): void {
        if (!this.playerData.assetsLoaded || this.playerData.sprites.size === 0) {
            console.warn(`Assets loaded: ${this.playerData.assetsLoaded}, Sprites available: ${this.playerData.sprites.size}`);
            console.warn("Assets not loaded or no sprites available for rendering.");
            return;
        }

        const sprite = this.playerData.sprites.get(this.playerData.currentState);
        if (!sprite) {
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

        // ALWAYS apply terrain height adjustment, regardless of the flag
        // This ensures visual consistency with ski tracks
        y -= this.playerData.currentVisualHeight;

        this.playerData.p.push();
        
        // ALWAYS apply terrain rotation if not flying or crashed, regardless of the flag
        if (!this.player.isFlying() && !this.player.isCrashed()) {
            // Translate to the sprite's position, rotate, then draw
            this.playerData.p.translate(x, y);
            this.playerData.p.rotate(this.playerData.currentRotation);
            
            // Render the sprite at the origin (0,0) since we've translated to its position
            sprite.render(0, 0, this.playerData.width, this.playerData.height);
        } else {
            // Draw normally without rotation
            sprite.render(x, y, this.playerData.width, this.playerData.height);
        }
        
        this.playerData.p.pop();

        if (this.playerData.collisionEffect > 0) {
            this.playerData.p.pop(); // Restore drawing state (for collision effect)
        }

        // Render debug hitbox if debug mode is enabled
        this.renderDebugHitbox();

        // Debug visualization for terrain height adjustment and sprite rotation
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
                x + Math.cos(this.playerData.currentRotation) * slopeLength,
                y + Math.sin(this.playerData.currentRotation) * slopeLength
            );

            // Display debug values
            this.playerData.p.fill(255, 255, 0);
            this.playerData.p.noStroke();
            this.playerData.p.text(`Visual Height: ${this.playerData.currentVisualHeight.toFixed(2)}`, 10, 210);
            this.playerData.p.text(`Visual Rotation: ${(this.playerData.currentRotation * 180 / Math.PI).toFixed(2)}°`, 10, 230);
            
            // Show terrain bumpiness info
            this.playerData.p.fill(0, 255, 255);
            this.playerData.p.text(`Terrain bumpy: ${terrainHeight.toFixed(3)}`, 10, 250);
            this.playerData.p.text(`Slope angle: ${(slope.angle * 180 / Math.PI).toFixed(1)}°`, 10, 270);
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