import { SkierData, SkierState } from './skier.entity';
import { ICollidable } from '../collision/ICollidable';
import { WeatherState } from '../weather/weatherSystem';

/**
 * Shared updater for all skier entities
 */
export class SkierUpdater {
    private skierData: SkierData;
    
    // Timing properties
    private flyingTimer: number = 0;
    private readonly flyingDuration: number = 60; // Flying state lasts for 60 frames (1 second at 60fps)
    private crashRecoveryTimer: number = 0;
    private readonly crashRecoveryDuration: number = 180; // 3 seconds to recover from crash
    private stateTransitionTimer: number = 0;
    private stateTransitionDelay: number = 10; // Frames to wait before allowing another state change
    
    // Movement properties
    private collisionCount: number = 0;
    
    // Visual transition properties
    private heightSmoothingFactor: number = 0.15;

    constructor(skierData: SkierData) {
        this.skierData = skierData;
    }

    /**
     * Update skier state and position
     * @param horizontalOffset Optional horizontal offset for AI skiers
     */
    public update(horizontalOffset: number = 0): void {
        // Update speed smoothly
        this.updateSkierSpeed();
        
        // Update flying timer
        if (this.isFlying() && this.flyingTimer > 0) {
            this.flyingTimer--;

            // When flying timer ends, transition to crashed state
            if (this.flyingTimer === 0) {
                this.transitionToCrashed();
            }
        }

        // Update crash recovery timer
        if (this.isCrashed() && this.crashRecoveryTimer > 0) {
            this.crashRecoveryTimer--;

            // When recovery timer ends, reset to regular state
            if (this.crashRecoveryTimer === 0) {
                this.resetAfterCrash();
            }
        }

        // Only perform movement if not crashed
        if (!this.isCrashed()) {
            this.updateMovement(horizontalOffset);
        }

        // Add ski tracks
        this.updateSkiTracks();

        // Update state transition timer
        if (this.stateTransitionTimer > 0) {
            this.stateTransitionTimer--;
        }

        // Update collision effect
        if (this.skierData.collisionEffect > 0) {
            this.skierData.collisionEffect--;
        }

        // Update terrain height and rotation
        this.updateTerrainEffects();
    }
    
    /**
     * Update skier speed with smooth transition
     */
    private updateSkierSpeed(): void {
        // Only use difficulty manager for player entities
        if (this.skierData.type === 'player') {
            // Get base speed from difficulty manager
            const baseDifficultySpeed = this.skierData.game.difficultyManager.getPlayerSpeed();
            
            // Calculate target speed = base difficulty speed + skier's speed offset
            // Ensure it's never below the base difficulty level
            const targetSpeed = Math.max(baseDifficultySpeed, baseDifficultySpeed + this.skierData.speedOffset);
            
            // Apply collision effect to speed (reduce speed during collision, but not to a complete stop)
            let actualTargetSpeed = targetSpeed;
            if (this.skierData.collisionEffect > 0) {
                // Apply a mild slowdown during collision effect (70% of normal speed)
                // The higher the collision effect, the more slowdown
                const collisionSlowdownFactor = 0.7 + (0.3 * (1 - this.skierData.collisionEffect / 45));
                actualTargetSpeed = targetSpeed * collisionSlowdownFactor;
            }
            
            // Smoothly transition current speed towards target speed
            if (this.skierData.currentSpeed !== actualTargetSpeed) {
                const diff = actualTargetSpeed - this.skierData.currentSpeed;
                // Use faster transition when slowing down due to collision
                const transitionFactor = this.skierData.collisionEffect > 0 ? 0.3 : this.skierData.speedTransitionFactor;
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
    protected updateMovement(horizontalOffset: number = 0): void {
        // For player, we always use the current speed
        const playerSpeed = this.skierData.currentSpeed;
        
        // Calculate movement speed (faster when flying)
        const speedMultiplier = this.isFlying() ? 2.0 : 1.0;
        
        // Apply weather effects to movement (only for player)
        let weatherControlDifficulty = 0;
        
        if (this.skierData.type === 'player') {
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
        }
        
        // For player entities, calculate speed normally
        const baseSpeed = this.skierData.type === 'player' ? 
                         playerSpeed * speedMultiplier : 
                         playerSpeed; // AI skiers pass their own speed
        
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
        
        // Apply horizontal offset for AI skiers
        if (horizontalOffset !== 0) {
            this.skierData.worldPos.x += horizontalOffset;
        }
    }

    private updateSkiTracks(): void {
        // Only player entities leave ski tracks
        if (this.skierData.type === 'player' && 
            this.skierData.currentState !== SkierState.CRASHED && 
            !this.isFlying()) {
                
            // Get the current sprite from the data
            const currentSprite = this.skierData.sprites.get(this.skierData.currentState);
            
            if (!currentSprite) {
                return;
            }
            
            // Calculate position at the bottom center of the sprite bounding box
            const trackX = this.skierData.worldPos.x;
            let trackY = this.skierData.worldPos.y;
            
            // Always apply the height adjustment
            trackY -= this.skierData.currentVisualHeight;
            trackY += currentSprite.spriteHeight / 2;
            
            // Add the ski track point
            this.skierData.game.skiTrack.addPoint(trackX, trackY);
        }
    }

    private updateTerrainEffects(): void {
        // Always calculate terrain height for smoother transitions
        if (this.skierData.game.world) {
            const terrainHeight = this.skierData.game.world.getHeightAtPosition(this.skierData.worldPos);
            // Gradually adjust current visual height toward target terrain height
            this.updateVisualHeight(
                this.skierData.currentVisualHeight * (1 - this.heightSmoothingFactor) +
                (terrainHeight * this.skierData.terrainHeightFactor) * this.heightSmoothingFactor
            );
        }

        // Always calculate terrain rotation for smoother transitions
        // Only skip rotation for flying or crashed states
        if (!this.isFlying() && !this.isCrashed() && this.skierData.game.world) {
            const slope = this.skierData.game.world.getSlopeAtPosition(this.skierData.worldPos);
            // Gradually adjust current rotation toward target slope angle
            const targetRotation = slope.angle * this.skierData.terrainRotationFactor;
            this.updateRotation(
                this.skierData.currentRotation * (1 - this.heightSmoothingFactor) +
                targetRotation * this.heightSmoothingFactor
            );
        } else {
            // Gradually reset rotation to zero when flying or crashed
            this.updateRotation(
                this.skierData.currentRotation * (1 - this.heightSmoothingFactor)
            );
        }
    }

    public updateSkierState(newState: SkierState): void {
        this.skierData.currentState = newState;
    }

    public updateCollisionEffect(effect: number): void {
        this.skierData.collisionEffect = effect;
    }

    private updateVisualHeight(height: number): void {
        this.skierData.currentVisualHeight = height;
    }

    private updateRotation(rotation: number): void {
        this.skierData.currentRotation = rotation;
    }

    /**
     * Turn right (player control method, may be used by AI)
     */
    public turnRight(): boolean {
        // Prevent turning if crashed or flying
        if (this.isCrashed() || this.isFlying() || this.stateTransitionTimer > 0) {
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
                this.updateSkierState(SkierState.LEFT_DOWN);
                break;
            case SkierState.LEFT_DOWN:
                this.updateSkierState(SkierState.DOWN);
                break;
            case SkierState.DOWN:
                this.updateSkierState(SkierState.RIGHT_DOWN);
                break;
            case SkierState.RIGHT_DOWN:
                this.updateSkierState(SkierState.RIGHT);
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
        // Prevent turning if crashed or flying
        if (this.isCrashed() || this.isFlying() || this.stateTransitionTimer > 0) {
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
                this.updateSkierState(SkierState.RIGHT_DOWN);
                break;
            case SkierState.RIGHT_DOWN:
                this.updateSkierState(SkierState.DOWN);
                break;
            case SkierState.DOWN:
                this.updateSkierState(SkierState.LEFT_DOWN);
                break;
            case SkierState.LEFT_DOWN:
                this.updateSkierState(SkierState.LEFT);
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
        this.updateCollisionEffect(30);

        // Log collision
        console.debug(`${this.skierData.type} collided with ${other.type}`);

        // Increment collision count
        this.collisionCount++;

        // Different effects based on collision count and obstacle type
        if (this.collisionCount >= 4 && this.skierData.type === 'player') {
            // On fourth collision, transition to flying state (player only)
            this.transitionToFlyingState();
        } else {
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
        }
    }

    /**
     * Transitions the skier to the appropriate flying state based on current direction
     */
    public transitionToFlyingState(): void {
        // Map regular states to flying states
        switch (this.skierData.currentState) {
            case SkierState.DOWN:
                this.updateSkierState(SkierState.FLYING_DOWN);
                break;
            case SkierState.RIGHT_DOWN:
                this.updateSkierState(SkierState.FLYING_RIGHT_DOWN);
                break;
            case SkierState.RIGHT:
                this.updateSkierState(SkierState.FLYING_RIGHT);
                break;
            case SkierState.LEFT_DOWN:
                this.updateSkierState(SkierState.FLYING_LEFT_DOWN);
                break;
            case SkierState.LEFT:
                this.updateSkierState(SkierState.FLYING_LEFT);
                break;
            default:
                // If already in a flying or crashed state, do nothing
                return;
        }

        // Set flying timer
        this.flyingTimer = this.flyingDuration;

        // Apply special flying effect
        this.updateCollisionEffect(this.flyingDuration);

        console.debug(`${this.skierData.type} is now flying! Current state: ${SkierState[this.skierData.currentState]}`);
    }

    /**
     * Transitions the skier to crashed state
     */
    public transitionToCrashed(): void {
        this.updateSkierState(SkierState.CRASHED);
        this.crashRecoveryTimer = this.crashRecoveryDuration;
        console.debug(`${this.skierData.type} has crashed!`);
    }

    /**
     * Make skier crash immediately
     */
    public crash(): void {
        this.transitionToCrashed();
    }

    /**
     * Resets skier after a crash
     */
    private resetAfterCrash(): void {
        this.updateSkierState(SkierState.DOWN);
        this.collisionCount = 0;
        console.debug(`${this.skierData.type} recovered from crash`);
    }

    /**
     * Checks if skier is in a flying state
     */
    public isFlying(): boolean {
        return this.skierData.currentState === SkierState.FLYING_DOWN ||
            this.skierData.currentState === SkierState.FLYING_RIGHT_DOWN ||
            this.skierData.currentState === SkierState.FLYING_RIGHT ||
            this.skierData.currentState === SkierState.FLYING_LEFT_DOWN ||
            this.skierData.currentState === SkierState.FLYING_LEFT;
    }

    /**
     * Checks if skier is in crashed state
     */
    public isCrashed(): boolean {
        return this.skierData.currentState === SkierState.CRASHED;
    }

    /**
     * Checks if skier is in any collision state
     */
    public isInCollisionState(): boolean {
        return this.skierData.collisionEffect > 0 || this.isFlying() || this.isCrashed();
    }
}
