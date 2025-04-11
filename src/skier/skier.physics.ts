import { SkierData, SkierEntity, SkierState } from './skier.entity';

export class SkierPhysics {
    // References to the skier data
    private skierData: SkierData;

    private frameCount: number = 0; // Frame count for timing updates

    constructor(skierData: SkierData, private main: SkierEntity) {
        this.skierData = skierData;
        this.frameCount = 0; // Initialize frame count
    }

    /**
     * Main update method to be called each frame from the updater
     */
    public update(): void {
        const groundLevel = this.readGroundLevel()
        this.skierData.groundLevel = groundLevel
        // update gravity, but only every 5 frames
        if (this.frameCount % 3 === 0) {
            this.skierData.verticalVelocity += this.skierData.gravityValue;
        }
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
        console.log(`[physics]: zAxis: ${this.skierData.zAxis} 
            groundLevel: ${this.skierData.groundLevel} verticalVelocity: ${this.skierData.verticalVelocity}, grounded: ${this.skierData.isGrounded}`);
    }

    readGroundLevel(): number {
        return this.skierData.game.world.getHeightAtPosition(this.skierData.worldPos);
    }
}