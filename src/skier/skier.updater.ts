import { SkierData, SkierEntity, SkierState } from './skier.entity';
import { ICollidable } from '../collision/ICollidable';
import { WeatherState } from '../weather/weatherSystem';

/**
 * Shared updater for all skier entities
 */
export class SkierUpdater {
    private skierData: SkierData;

    // Timing properties


    private stateTransitionTimer: number = 0;
    private stateTransitionDelay: number = 10; // Frames to wait before allowing another state change

    // Movement properties
    private collisionCount: number = 0;
    main: SkierEntity;

    constructor(skierData: SkierData, main: SkierEntity) {
        this.skierData = skierData;
        this.main = main;
    }

    /**
     * Update skier state and position
     */
    public update(): void {
        const now = Date.now();
        
        if (this.skierData.crashTimer && now > this.skierData.crashTimer) {
            this.skierData.currentState = SkierState.CRASHED;
            this.skierData.isGrounded = true;
            this.skierData.collisionEffectTimer = 0; // Reset collision effect
        }
        // Update speed smoothly
        this.updateSkierSpeed();

        // Update crash recovery timer
        if (this.main.isCrashed() && this.main.crashRecoveryTimer > 0) {
            this.main.crashRecoveryTimer--;

            // When recovery timer ends, reset to regular state
            if (this.main.crashRecoveryTimer === 0) {
                this.resetAfterCrash();
            }
        }

        this.updateMovement();

        if (this.isCrashing()) {
            return
        }

        // Add ski tracks
        this.updateSkiTracks();

        // Update state transition timer
        if (this.stateTransitionTimer > 0) {
            this.stateTransitionTimer--;
        }

        // Update collision effect
        if (this.skierData.collisionEffectTimer > 0) {
            this.skierData.collisionEffectTimer--;
        }
    }
    isCrashing():boolean {
        return !!this.skierData.crashTimer
    }

    /**
     * Update skier speed with smooth transition
     */
    private updateSkierSpeed(): void {
        // Only use difficulty manager for player entities
        if (this.skierData.type === 'player') {
            // Get base speed from difficulty manager
            const baseDifficultySpeed = this.skierData.game.difficultyManager.getPlayerSpeed();

            // Calculate target speed based on game mode
            let targetSpeed;

            if (this.skierData.game.debug) {
                // In debug mode, allow speed to go all the way to zero or negative
                targetSpeed = baseDifficultySpeed + this.skierData.speedOffset;
            } else {
                // In normal mode, enforce minimum speed
                targetSpeed = Math.max(baseDifficultySpeed, baseDifficultySpeed + this.skierData.speedOffset);
            }

            // Apply collision effect to speed (reduce speed during collision, but not to a complete stop)
            let actualTargetSpeed = targetSpeed;
            if (this.skierData.collisionEffectTimer > 0) {
                // Apply a mild slowdown during collision effect (70% of normal speed)
                // The higher the collision effect, the more slowdown
                const collisionSlowdownFactor = 0.7 + (0.3 * (1 - this.skierData.collisionEffectTimer / 45));
                actualTargetSpeed = targetSpeed * collisionSlowdownFactor;
            }

            // Smoothly transition current speed towards target speed
            if (this.skierData.currentSpeed !== actualTargetSpeed) {
                const diff = actualTargetSpeed - this.skierData.currentSpeed;
                // Use faster transition when slowing down due to collision
                const transitionFactor = this.skierData.collisionEffectTimer > 0 ? 0.3 : this.skierData.speedTransitionFactor;
                this.skierData.currentSpeed += diff * transitionFactor;

                // If very close to target, snap to it
                if (Math.abs(diff) < 0.01) {
                    this.skierData.currentSpeed = actualTargetSpeed;
                }
            }
        }
        // AI skiers manage their speed differently, handled in their own classes
    }

    /**
     * Update movement based on current state
     * For Player: applies user inputs and weather effects
     * For AI: parameters control movement (used differently based on AI type)
     */
    protected updateMovement(): void {
        // For player, we always use the current speed
        const playerSpeed = this.skierData.currentSpeed;

        // Calculate movement speed
        const speedMultiplier = 1.0;

        // Apply weather effects to movement (only for player)
        let weatherControlDifficulty = 0;

        const weatherState = this.skierData.game.weatherSystem.getCurrentWeatherState();
        switch (weatherState) {
            case WeatherState.LIGHT_SNOW:
                weatherControlDifficulty = 0.1; // Slight control difficulty
                break;
            case WeatherState.HEAVY_SNOW:
                weatherControlDifficulty = 0.25; // More control difficulty
                break;
            case WeatherState.BLIZZARD:
                weatherControlDifficulty = 0.4; // Major control difficulty
                break;
            default:
                weatherControlDifficulty = 0;
        }

        // Random sideways movement in worse weather conditions (player only)
        if (weatherControlDifficulty > 0) {
            this.skierData.worldPos.x += (Math.random() - 0.5) * weatherControlDifficulty * 5;
        }

        let baseSpeed = playerSpeed

        // In debug mode, allow the player to completely stop or even move backwards
        if (this.skierData.game.debug && this.skierData.type === 'player') {
            // If speed is very close to zero, just set it to exactly zero to prevent tiny movement
            if (Math.abs(baseSpeed) < 0.01) {
                baseSpeed = 0;
            }
        } else {
            // In normal gameplay, enforce a minimum forward speed
            baseSpeed = Math.max(0.1, baseSpeed);
        }

        // Skip movement completely if speed is zero (debug mode only)
        if (baseSpeed === 0) {
            return;
        }

        // Move based on current state
        switch (this.skierData.currentState) {
            case SkierState.LEFT:
            case SkierState.FLYING_LEFT:
                this.skierData.worldPos.x -= baseSpeed;
                this.skierData.worldPos.y += baseSpeed / 4;
                break;
            case SkierState.RIGHT:
            case SkierState.FLYING_RIGHT:
                this.skierData.worldPos.x += baseSpeed;
                this.skierData.worldPos.y += baseSpeed / 4;
                break;
            case SkierState.LEFT_DOWN:
            case SkierState.FLYING_LEFT_DOWN:
                this.skierData.worldPos.x -= baseSpeed / 2;
                this.skierData.worldPos.y += baseSpeed * 0.8;
                break;
            case SkierState.RIGHT_DOWN:
            case SkierState.FLYING_RIGHT_DOWN:
                this.skierData.worldPos.x += baseSpeed / 2;
                this.skierData.worldPos.y += baseSpeed * 0.8;
                break;
            case SkierState.DOWN:
            case SkierState.FLYING_DOWN:
                // No horizontal movement when going straight down
                this.skierData.worldPos.y += baseSpeed;
                break;
            case SkierState.CRASHED:
                // No movement when crashed
                break;
        }
        if (!this.skierData.isGrounded) {
            console.debug(`[updater] state: ${SkierState[this.skierData.currentState]}, `);
        }
    }

    private updateSkiTracks(): void {
        // Skip track generation if:
        // 1. Not grounded (airborne)
        if (this.skierData.currentState === SkierState.CRASHED ||
            this.main.isFlying()) {
            return;
        }

        // Get the current sprite from the data
        const currentSprite = this.skierData.sprites.get(this.skierData.currentState);

        if (!currentSprite) {
            console.warn(`No sprite found for state ${SkierState[this.skierData.currentState]}`);
            return;
        }

        // Calculate position at the bottom center of the sprite bounding box
        const trackX = this.skierData.worldPos.x;
        let trackY = this.skierData.worldPos.y;
        // const screenPos = this.skierData.game.camera.worldToScreen(this.skierData.worldPos);

        // add the "visual" height to the track position
        // Calculate height above ground for visual effects
        // NOTE: not sure why I can't get the these ski tracks to use the same getGroundY and getVisualY functions as the main render method
        let heightAboveGround = this.skierData.zAxis;
        heightAboveGround = heightAboveGround * 20
        trackY -= heightAboveGround

        // Apply height adjustment to track position
        trackY += (currentSprite.spriteHeight * currentSprite.getScale() / 2);

        // Add the ski track point to this skier's own track
        this.skierData.skiTrack.addPoint(trackX, trackY);
    }

    /**
     * Turn right (player control method, may be used by AI)
     */
    public turnRight(): boolean {
        // Prevent turning if crashed, flying, or not grounded
        if (!this.skierData.isGrounded || this.stateTransitionTimer > 0) {
            return false;
        }

        // Random chance to fail turning in bad weather (player only)
        if (this.skierData.type === 'player') {
            const weatherState = this.skierData.game.weatherSystem.getCurrentWeatherState();
            if (weatherState !== WeatherState.CLEAR) {
                const failChance = weatherState === WeatherState.BLIZZARD ? 0.3 :
                    weatherState === WeatherState.HEAVY_SNOW ? 0.15 : 0.05;
                if (Math.random() < failChance) {
                    console.debug("Turn failed due to weather conditions");
                    return false;
                }
            }
        }

        // Progressive state transition when turning right
        switch (this.skierData.currentState) {
            case SkierState.LEFT:
                this.skierData.currentState = SkierState.LEFT_DOWN;
                break;
            case SkierState.LEFT_DOWN:
                this.skierData.currentState = SkierState.DOWN;
                break;
            case SkierState.DOWN:
                this.skierData.currentState = SkierState.RIGHT_DOWN;
                break;
            case SkierState.RIGHT_DOWN:
                this.skierData.currentState = SkierState.RIGHT;
                break;
            case SkierState.RIGHT:
                // Already at maximum right turn
                return false;
        }

        // Set timer to prevent rapid state changes
        this.stateTransitionTimer = this.stateTransitionDelay;
        return true;
    }

    /**
     * Turn left (player control method, may be used by AI)
     */
    public turnLeft(): boolean {
        // Prevent turning if crashed, flying, or not grounded
        if (!this.skierData.isGrounded || this.stateTransitionTimer > 0) {
            return false;
        }

        // Random chance to fail turning in bad weather (player only)
        if (this.skierData.type === 'player') {
            const weatherState = this.skierData.game.weatherSystem.getCurrentWeatherState();
            if (weatherState !== WeatherState.CLEAR) {
                const failChance = weatherState === WeatherState.BLIZZARD ? 0.3 :
                    weatherState === WeatherState.HEAVY_SNOW ? 0.15 : 0.05;
                if (Math.random() < failChance) {
                    console.debug("Turn failed due to weather conditions");
                    return false;
                }
            }
        }

        // Progressive state transition when turning left
        switch (this.skierData.currentState) {
            case SkierState.RIGHT:
                this.skierData.currentState = SkierState.RIGHT_DOWN;
                break;
            case SkierState.RIGHT_DOWN:
                this.skierData.currentState = SkierState.DOWN;
                break;
            case SkierState.DOWN:
                this.skierData.currentState = SkierState.LEFT_DOWN;
                break;
            case SkierState.LEFT_DOWN:
                this.skierData.currentState = SkierState.LEFT;
                break;
            case SkierState.LEFT:
                // Already at maximum left turn
                return false;
        }

        // Set timer to prevent rapid state changes
        this.stateTransitionTimer = this.stateTransitionDelay;
        return true;
    }

    /**
     * Handle collisions with obstacles/entities
     */
    public handleCollision(other: ICollidable): void {
        // Set collision effect for visual feedback
        this.skierData.collisionEffectTimer = 30; // Default collision effect

        // Log collision
        console.debug(`${this.skierData.type} collided with ${other.type}`);

        // Different effects based on obstacle type
        switch (other.type) {
            case 'tree':
                // Trees cause a significant slowdown
                this.skierData.collisionEffectTimer = 45; // Longer effect
                break;

            case 'rock':
                // Rocks cause a medium slowdown
                this.skierData.collisionEffectTimer = 30; // Medium effect
                break;

            default:
                this.skierData.collisionEffectTimer = 20; // Default effect for other entities
        }

        // Increment collision count
        this.collisionCount++;

        // On third collision (or more), transition to flying state (player only)
        if (this.collisionCount >= 3) {
            this.crashIn(1); // 1 seconds to crash
            this.main.transitionToFlyingState()
        }
    }
    crashIn(timer: number) {
        this.skierData.crashTimer = Date.now() + timer * 1000; // Set crash timer to 3 seconds
    }

    /**
     * Resets skier after a crash
     */
    private resetAfterCrash(): void {
        // Return to normal state after crash
        // Choose the appropriate ground state based on the previous flying state
        // Default to DOWN if we can't determine the previous state
        this.skierData.currentState = SkierState.DOWN;
        this.skierData.isGrounded = true; // Reset grounded state
        this.skierData.collisionEffectTimer = 0; // Reset collision effect
    }
}
