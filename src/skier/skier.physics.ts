import { SkierData, SkierEntity, SkierState } from './skier.entity';

export class SkierPhysics {
    // References to the skier data
    private skierData: SkierData;

    // Rotation smoothing
    private rotationSmoothingFactor: number = 0.1; // Controls how quickly rotation adjusts to terrain

    constructor(skierData: SkierData, private main: SkierEntity) {
        this.skierData = skierData;
    }

    /**
     * Main update method to be called each frame from the updater
     */
    public update(): void {
        const groundLevel = this.readGroundLevel()
        this.skierData.groundLevel = groundLevel
        
        // Update terrain-based rotation
        this.updateTerrainRotation();
        
        // update gravity
        this.skierData.verticalVelocity += this.skierData.gravityValue;
        // check gravity
        this.skierData.zAxis -= this.skierData.verticalVelocity

        // check if zAxis is below ground level
        const tolerance = .3
        if (this.skierData.zAxis <= this.skierData.groundLevel) {
            // skier is grounded
            this.skierData.isGrounded = true;
            this.skierData.verticalVelocity = 0; // Reset vertical velocity when grounded
            this.skierData.zAxis = this.skierData.groundLevel; // Snap to ground level
            this.skierData.showShadow = false;
        } else if (this.skierData.groundLevel < this.skierData.zAxis - tolerance) {
            this.skierData.isGrounded = false;
            this.skierData.showShadow = true; // Show shadow when airborne
        }
    }

    /**
     * Update the skier's rotation based on terrain slope
     */
    private updateTerrainRotation(): void {
        // Skip rotation updates if flying or crashed
        if (!this.skierData.isGrounded || 
            this.skierData.currentState === SkierState.CRASHED) {
            return;
        }
        
        // Get terrain slope from the world
        const slope = this.skierData.game.world.getSlopeAtPosition(this.skierData.worldPos);
        
        // Calculate target rotation based on terrain slope
        // The terrainRotationFactor controls how much the skier rotates with the terrain
        const targetRotation = slope.angle * this.skierData.terrainRotationFactor;
        
        // Smooth the rotation transition
        this.skierData.currentRotation = this.skierData.currentRotation * (1 - this.rotationSmoothingFactor) +
            targetRotation * this.rotationSmoothingFactor;
    }

    readGroundLevel(): number {
        return this.skierData.game.world.getHeightAtPosition(this.skierData.worldPos);
    }
}