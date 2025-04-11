import { SkierData, SkierEntity, SkierState } from './skier.entity';
import { ICollidable } from '../collision/ICollidable';

export class SkierPhysics {
    // References to the skier data
    private skierData: SkierData;

    // Physics tuning parameters
    private heightSmoothingFactor: number = 0.15; // Controls how quickly visual height adjusts to terrain

    // Track previous terrain height to determine if terrain is rising or falling
    private previousTerrainHeight: number = 0;

    // Track if terrain was rising on the previous frame
    private wasTerrainRising: boolean = false;

    // Crash handling
    private crashRecoveryTimer: number = 0;
    private readonly crashRecoveryDuration: number = 180; // 3 seconds to recover from crash
    
    // Collision tracking
    private collisionCount: number = 0;

    constructor(skierData: SkierData, private main: SkierEntity) {
        this.skierData = skierData;
    }

    /**
     * Main update method to be called each frame from the updater
     */
    public update(): void {
        /** TODO
         * psudo code:
         * - read of ground level
         * - update skiier with their height, depending on current isGrounded state
         * - update skier z position, z += gravity
         *   if z < groundLevel, set isGrounded = true
         *   - if z > (groundLevel + someTolerance), set isGrounded = false
         * - if not grounded, set shadow flag
         * 
         * psudo code:
         * 
        */

        const groundLevel = this.readGroundLevel()
        this.skierData.groundLevel = groundLevel
        // update gravity
        // this.skierData.verticalVelocity += this.skierData.gravityValue;
        // check gravity
        this.skierData.zAxis -= this.skierData.gravityValue;
        
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
    readGroundLevel():number {
        return this.skierData.game.world.getHeightAtPosition(this.skierData.worldPos);
    }

    /**
     * Handle collisions with obstacles/entities
     */
    public handleCollision(other: ICollidable): void {
        // Snowdrifts are handled via the heightmap system, not via collision
        if (other.type === 'snowdrift') {
            // No special collision handling needed - terrain following handles this
            console.debug(`${this.skierData.type} is over a snowdrift (handled by terrain system)`);
            return;
        }

        // Set collision effect for visual feedback
        this.updateCollisionEffect(30);

        // Log collision
        console.debug(`${this.skierData.type} collided with ${other.type}`);

        // Different effects based on obstacle type
        switch (other.type) {
            case 'tree':
                // Trees cause a significant slowdown
                this.updateCollisionEffect(45); // Longer effect
                break;

            case 'rock':
                // Rocks cause a medium slowdown
                this.updateCollisionEffect(30);
                break;

            default:
                this.updateCollisionEffect(20);
        }

        // Increment collision count
        this.collisionCount++;

        // On third collision (or more), transition to flying state (player only)
        if (this.collisionCount >= 3 && this.skierData.type === 'player') {
            this.main.transitionToFlyingState();
        }
    }

    /**
     * Update collision effect value
     */
    private updateCollisionEffect(effect: number): void {
        this.skierData.collisionEffectTimer = effect;
    }

    // private updateTerrainEffects(): void {
    //     // Calculate current terrain height (Z value/groundLevel)
    //     let currentTerrainHeight = 0;
    //     currentTerrainHeight = this.skierData.game.world.getHeightAtPosition(this.skierData.worldPos);
    //     // Save the current terrain height as our ground level in Z space
    //     this.skierData.groundLevel = currentTerrainHeight * this.skierData.terrainHeightFactor;

    //     // Calculate if terrain is rising or falling by comparing current to previous terrain height
    //     // (not worldPos.y, which is always increasing as the skier moves down the hill)
    //     const terrainHeightDelta = currentTerrainHeight - this.previousTerrainHeight;
    //     const terrainRising = terrainHeightDelta > 0;

    //     // Calculate the steepness of the terrain slope
    //     const terrainSteepness = Math.abs(terrainHeightDelta);
    //     const isSteepTerrain = terrainSteepness > 0.03; // Threshold for considering terrain "steep"

    //     // Track if terrain was rising on the previous frame but is now falling
    //     // This indicates we're going over a crest (like the peak of a snowdrift)
    //     const isGoingOverCrest = this.wasTerrainRising && !terrainRising && isSteepTerrain;

    //     // Log debug info for significant terrain changes
    //     if ((Math.abs(terrainHeightDelta) > 0.02 || this.skierData.isGrounded !== this.previousAirborneState) && this.skierData.type === 'player') {
    //         console.log(`[TERRAIN] Delta: ${terrainHeightDelta.toFixed(3)}, Rising: ${terrainRising}, Current Height: ${currentTerrainHeight.toFixed(3)}, Crest: ${isGoingOverCrest}`);
    //         console.log(`[SKIER] Visual Height: ${this.skierData.currentVisualHeight.toFixed(3)}, Ground Level: ${this.skierData.groundLevel.toFixed(3)}, Grounded: ${this.skierData.isGrounded}`);
    //         console.log(`[PHYSICS] Height Diff: ${(this.skierData.currentVisualHeight - this.skierData.groundLevel).toFixed(3)}, Velocity: ${this.skierData.verticalVelocity.toFixed(3)}`);
    //     }

    //     const wasPreviouslyGrounded = this.skierData.isGrounded;

    //     // The minimum height difference needed to consider the skier truly airborne
    //     const minAirborneHeight = 0.4; // Lower threshold for better detection

    //     // The height difference needed to transition to flying state
    //     const flyingThreshold = 3.0; // Height threshold for flying state

    //     // Calculate height difference from the ground
    //     const heightAboveGround = this.skierData.currentVisualHeight - this.skierData.groundLevel;

    //     // Add an initial "launch" velocity when going over the crest of a snowdrift
    //     if (isGoingOverCrest && wasPreviouslyGrounded) {
    //         // Going over the crest of a hill - add launch velocity based on steepness
    //         // This creates a nice "jump" effect from the momentum
    //         // Only launch if the steepness is significant enough
    //         if (terrainSteepness > 0.05) {
    //             const launchVelocity = Math.min(0.4, terrainSteepness * 2.0);
    //             this.skierData.verticalVelocity = launchVelocity;
    //             this.skierData.isGrounded = false; // Immediately unground when going over a crest

    //             if (this.skierData.type === 'player') {
    //                 console.log(`[JUMP] Launching from crest with velocity: ${launchVelocity.toFixed(2)}, steepness: ${terrainSteepness.toFixed(3)}`);
    //             }
    //         }
    //     }
    //     // If the terrain is rising (going up a bump), generally follow terrain
    //     // But don't force grounded if we're significantly above the terrain
    //     else if (terrainRising) {
    //         if (heightAboveGround <= minAirborneHeight || this.skierData.verticalVelocity <= 0) {
    //             // Only force grounded if we're close to the ground or moving down
    //             // Add additional check to prevent small bumps from forcing grounded state
    //             if (heightAboveGround < 0.15) {
    //                 this.skierData.isGrounded = true;
    //             }
    //         }
    //     }

    //     // Apply gravity when not grounded
    //     if (!this.skierData.isGrounded) {
    //         // Simple gravity effect - pull skier down when airborne
    //         this.skierData.verticalVelocity -= 0.01; // Gravity constant

    //         // Update visual height based on current vertical velocity
    //         this.skierData.currentVisualHeight += this.skierData.verticalVelocity;

    //         // Check if we've landed (currentVisualHeight <= groundLevel)
    //         if (this.skierData.currentVisualHeight <= this.skierData.groundLevel) {
    //             this.skierData.currentVisualHeight = this.skierData.groundLevel;
    //             this.skierData.verticalVelocity = 0;
    //             this.skierData.isGrounded = true;

    //             // Special landing logic - if landing with high velocity, could trigger extra effects
    //             // For example, landing too hard might cause a crash or bounce effect
    //             if (this.skierData.type === 'player') {
    //                 console.log(`[LAND] Landing after airborne movement`);
    //             }
    //         }
    //     } else {
    //         // For grounded movement, smoothly adjust visual height to match terrain
    //         // This creates a more natural terrain following effect
    //         const targetHeight = this.skierData.groundLevel;
    //         const heightDiff = targetHeight - this.skierData.currentVisualHeight;
    //         this.skierData.currentVisualHeight += heightDiff * this.heightSmoothingFactor;
            
    //         // Keep vertical velocity at zero while grounded
    //         this.skierData.verticalVelocity = 0;
    //     }

    //     // Store previous values for next frame comparisons
    //     this.previousTerrainHeight = currentTerrainHeight;
    //     this.previousAirborneState = this.skierData.isGrounded;
    //     this.wasTerrainRising = terrainRising;
    //     this.previousYPosition = this.skierData.worldPos.y;
    // }
}