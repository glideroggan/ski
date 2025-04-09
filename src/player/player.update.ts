// import { SkierData, SkierState } from '../skier/skier.entity';
// import { WeatherState } from '../weather/weatherSystem';
// import { Player } from './player';

// export class PlayerUpdate {
//     private playerData: SkierData;
//     private player: Player;
    
//     // Timing properties
//     private flyingTimer: number = 0;
//     private readonly flyingDuration: number = 60; // Flying state lasts for 60 frames (1 second at 60fps)
//     private crashRecoveryTimer: number = 0;
//     private readonly crashRecoveryDuration: number = 180; // 3 seconds to recover from crash
//     private stateTransitionTimer: number = 0;
//     private stateTransitionDelay: number = 10; // Frames to wait before allowing another state change
    
//     // Movement properties
//     private maxPlayerMovement: number = 4; // Base value, now will be modified by difficulty
//     private collisionCount: number = 0;
    
//     // Visual transition properties
//     private heightSmoothingFactor: number = 0.15;

//     constructor(playerData: SkierData, player: Player) {
//         this.playerData = playerData;
//         this.player = player;
//     }
    
//     // getCurrentState(): SkierState {
//     //     return this.playerData.currentState;
//     // }    public update(): void {
//     //     // Update speed smoothly
//     //     this.updatePlayerSpeed();
        
//     //     // Update flying timer
//     //     if (this.isFlying() && this.flyingTimer > 0) {
//     //         this.flyingTimer--;

//     //         // When flying timer ends, transition to crashed state
//     //         if (this.flyingTimer === 0) {
//     //             this.transitionToCrashed();
//     //         }
//     //     }

//     //     // Update crash recovery timer
//     //     if (this.isCrashed() && this.crashRecoveryTimer > 0) {
//     //         this.crashRecoveryTimer--;

//     //         // When recovery timer ends, reset to regular state
//     //         if (this.crashRecoveryTimer === 0) {
//     //             this.resetAfterCrash();
//     //         }
//     //     }

//     //     // Only perform movement if not crashed
//     //     if (!this.isCrashed()) {
//     //         // Use the shared skier updater functionality instead of duplicating code
//     //         this.player.skierUpdater.updateMovement();
//     //     }

//     //     // Add ski tracks
//     //     this.updateSkiTracks();

//     //     // Update state transition timer
//     //     if (this.stateTransitionTimer > 0) {
//     //         this.stateTransitionTimer--;
//     //     }

//     //     // Update collision effect
//     //     if (this.playerData.collisionEffect > 0) {
//     //         this.playerData.collisionEffect--;
//     //     }

//     //     // Update terrain height and rotation
//     //     this.updateTerrainEffects();
//     // }    /**
//      * Update player speed with smooth transition
//      */    
//     private updatePlayerSpeed(): void {
//         // Get base speed from difficulty manager
//         const baseDifficultySpeed = this.playerData.game.difficultyManager.getPlayerSpeed();
        
//         // Calculate target speed = base difficulty speed + player's speed offset
//         // Ensure it's never below the base difficulty level
//         const targetSpeed = Math.max(baseDifficultySpeed, baseDifficultySpeed + this.playerData.speedOffset);
        
//         // Apply collision effect to speed (reduce speed during collision, but not to a complete stop)
//         let actualTargetSpeed = targetSpeed;
//         if (this.playerData.collisionEffect > 0) {
//             // Apply a mild slowdown during collision effect (70% of normal speed)
//             // The higher the collision effect, the more slowdown
//             const collisionSlowdownFactor = 0.7 + (0.3 * (1 - this.playerData.collisionEffect / 45));
//             actualTargetSpeed = targetSpeed * collisionSlowdownFactor;
//         }
        
//         // Smoothly transition current speed towards target speed
//         if (this.playerData.currentSpeed !== actualTargetSpeed) {
//             const diff = actualTargetSpeed - this.playerData.currentSpeed;
//             // Use faster transition when slowing down due to collision
//             const transitionFactor = this.playerData.collisionEffect > 0 ? 0.3 : this.playerData.speedTransitionFactor;
//             this.playerData.currentSpeed += diff * transitionFactor;
            
//             // If very close to target, snap to it
//             if (Math.abs(diff) < 0.01) {
//                 this.playerData.currentSpeed = actualTargetSpeed;
//             }
//         }
//     }

//     // private updateSkiTracks(): void {
//     //     if (this.playerData.currentState !== PlayerState.CRASHED && !this.isFlying()) {
//     //         // Get the current sprite from the player data
//     //         const currentSprite = this.playerData.sprites.get(this.playerData.currentState);
            
//     //         if (!currentSprite) {
//     //             return;
//     //         }
            
//     //         // Calculate position at the bottom center of the sprite bounding box
//     //         const trackX = this.playerData.worldPos.x;
//     //         let trackY = this.playerData.worldPos.y;
            
//     //         // Always apply the height adjustment
//     //         trackY -= this.playerData.currentVisualHeight 
//     //         trackY +=  currentSprite.spriteHeight / 2;
            
//     //         // Add the ski track point
//     //         this.playerData.game.skiTrack.addPoint(trackX, trackY);
//     //     }
//     // }

//     // private updateTerrainEffects(): void {
//     //     // Always calculate terrain height for smoother transitions
//     //     if (this.playerData.game.world) {
//     //         const terrainHeight = this.playerData.game.world.getHeightAtPosition(this.playerData.worldPos);
//     //         // Gradually adjust current visual height toward target terrain height
//     //         this.updateVisualHeight(
//     //             this.playerData.currentVisualHeight * (1 - this.heightSmoothingFactor) +
//     //             (terrainHeight * this.playerData.terrainHeightFactor) * this.heightSmoothingFactor
//     //         );
//     //     }

//     //     // Always calculate terrain rotation for smoother transitions
//     //     // Only skip rotation for flying or crashed states
//     //     if (!this.isFlying() && !this.isCrashed() && this.playerData.game.world) {
//     //         const slope = this.playerData.game.world.getSlopeAtPosition(this.playerData.worldPos);
//     //         // Gradually adjust current rotation toward target slope angle
//     //         const targetRotation = slope.angle * this.playerData.terrainRotationFactor;
//     //         this.updateRotation(
//     //             this.playerData.currentRotation * (1 - this.heightSmoothingFactor) +
//     //             targetRotation * this.heightSmoothingFactor
//     //         );
//     //     } else {
//     //         // Gradually reset rotation to zero when flying or crashed
//     //         this.updateRotation(
//     //             this.playerData.currentRotation * (1 - this.heightSmoothingFactor)
//     //         );
//     //     }
//     // }

//     // public updatePlayerState(newState: PlayerState): void {
//     //     this.playerData.currentState = newState;
//     // }

//     // public updateCollisionEffect(effect: number): void {
//     //     this.playerData.collisionEffect = effect;
//     // }

//     // public updateVisualHeight(height: number): void {
//     //     this.playerData.currentVisualHeight = height;
//     // }

//     // public updateRotation(rotation: number): void {
//     //     this.playerData.currentRotation = rotation;
//     // }

//     // public turnRight(): boolean {
//     //     // Prevent turning if crashed or flying
//     //     if (this.isCrashed() || this.isFlying() || this.stateTransitionTimer > 0) {
//     //         return false;
//     //     }

//     //     // Random chance to fail turning in bad weather
//     //     const weatherState = this.playerData.game.weatherSystem.getCurrentWeatherState();
//     //     if (weatherState !== WeatherState.CLEAR) {
//     //         const failChance = weatherState === WeatherState.BLIZZARD ? 0.3 : 
//     //                            weatherState === WeatherState.HEAVY_SNOW ? 0.15 : 0.05;
//     //         if (Math.random() < failChance) {
//     //             console.debug("Turn failed due to weather conditions");
//     //             return false;
//     //         }
//     //     }

//     //     // Progressive state transition when turning right
//     //     switch (this.playerData.currentState) {
//     //         case PlayerState.LEFT:
//     //             this.updatePlayerState(PlayerState.LEFT_DOWN);
//     //             break;
//     //         case PlayerState.LEFT_DOWN:
//     //             this.updatePlayerState(PlayerState.DOWN);
//     //             break;
//     //         case PlayerState.DOWN:
//     //             this.updatePlayerState(PlayerState.RIGHT_DOWN);
//     //             break;
//     //         case PlayerState.RIGHT_DOWN:
//     //             this.updatePlayerState(PlayerState.RIGHT);
//     //             break;
//     //         case PlayerState.RIGHT:
//     //             // Already at maximum right turn
//     //             return false;
//     //     }

//     //     // Set timer to prevent rapid state changes
//     //     this.stateTransitionTimer = this.stateTransitionDelay;
//     //     return true;
//     // }

//     // public turnLeft(): boolean {
//     //     // Prevent turning if crashed or flying
//     //     if (this.isCrashed() || this.isFlying() || this.stateTransitionTimer > 0) {
//     //         return false;
//     //     }

//     //     // Random chance to fail turning in bad weather
//     //     const weatherState = this.playerData.game.weatherSystem.getCurrentWeatherState();
//     //     if (weatherState !== WeatherState.CLEAR) {
//     //         const failChance = weatherState === WeatherState.BLIZZARD ? 0.3 : 
//     //                            weatherState === WeatherState.HEAVY_SNOW ? 0.15 : 0.05;
//     //         if (Math.random() < failChance) {
//     //             console.debug("Turn failed due to weather conditions");
//     //             return false;
//     //         }
//     //     }

//     //     // Progressive state transition when turning left
//     //     switch (this.playerData.currentState) {
//     //         case PlayerState.RIGHT:
//     //             this.updatePlayerState(PlayerState.RIGHT_DOWN);
//     //             break;
//     //         case PlayerState.RIGHT_DOWN:
//     //             this.updatePlayerState(PlayerState.DOWN);
//     //             break;
//     //         case PlayerState.DOWN:
//     //             this.updatePlayerState(PlayerState.LEFT_DOWN);
//     //             break;
//     //         case PlayerState.LEFT_DOWN:
//     //             this.updatePlayerState(PlayerState.LEFT);
//     //             break;
//     //         case PlayerState.LEFT:
//     //             // Already at maximum left turn
//     //             return false;
//     //     }

//     //     // Set timer to prevent rapid state changes
//     //     this.stateTransitionTimer = this.stateTransitionDelay;
//     //     return true;
//     // }

//     // public handleCollision(obstacle: Obstacle): void {
//     //     // Set collision effect for visual feedback
//     //     this.updateCollisionEffect(30);

//     //     console.debug('Player collided with obstacle:', obstacle.type);

//     //     // Increment collision count
//     //     this.collisionCount++;
//     //     console.debug(`Collision count: ${this.collisionCount}`);

//     //     // Different effects based on collision count and obstacle type
//     //     if (this.collisionCount >= 4) {
//     //         // On fourth collision, transition to flying state
//     //         this.transitionToFlyingState();
//     //     } else {
//     //         // Different effects based on obstacle type
//     //         switch (obstacle.type) {
//     //             case 'tree':
//     //                 // Trees cause a significant slowdown
//     //                 this.updateCollisionEffect(45); // Longer effect
//     //                 break;
//     //             case 'rock':
//     //                 // Rocks cause a medium slowdown
//     //                 this.updateCollisionEffect(30);
//     //                 break;
//     //             default:
//     //                 this.updateCollisionEffect(20);
//     //         }
//     //     }
//     // }

//     /**
//      * Transitions the player to the appropriate flying state based on current direction
//      */
//     // private transitionToFlyingState(): void {
//     //     // Map regular states to flying states
//     //     switch (this.playerData.currentState) {
//     //         case PlayerState.DOWN:
//     //             this.updatePlayerState(PlayerState.FLYING_DOWN);
//     //             break;
//     //         case PlayerState.RIGHT_DOWN:
//     //             this.updatePlayerState(PlayerState.FLYING_RIGHT_DOWN);
//     //             break;
//     //         case PlayerState.RIGHT:
//     //             this.updatePlayerState(PlayerState.FLYING_RIGHT);
//     //             break;
//     //         case PlayerState.LEFT_DOWN:
//     //             this.updatePlayerState(PlayerState.FLYING_LEFT_DOWN);
//     //             break;
//     //         case PlayerState.LEFT:
//     //             this.updatePlayerState(PlayerState.FLYING_LEFT);
//     //             break;
//     //         default:
//     //             // If already in a flying or crashed state, do nothing
//     //             return;
//     //     }

//     //     // Set flying timer
//     //     this.flyingTimer = this.flyingDuration;

//     //     // Apply special flying effect
//     //     this.updateCollisionEffect(this.flyingDuration);

//     //     console.debug(`Player is now flying! Current state: ${PlayerState[this.playerData.currentState]}`);
//     // }

//     /**
//      * Transitions the player to crashed state
//      */
//     // private transitionToCrashed(): void {
//     //     this.updatePlayerState(PlayerState.CRASHED);
//     //     this.crashRecoveryTimer = this.crashRecoveryDuration;
//     //     console.debug("Player has crashed!");
//     // }

//     /**
//      * Resets player after a crash
//      */
//     // private resetAfterCrash(): void {
//     //     this.updatePlayerState(PlayerState.DOWN);
//     //     this.collisionCount = 0;
//     //     console.debug("Player recovered from crash");
//     // }

//     /**
//      * Checks if player is in a flying state
//      */
//     // public isFlying(): boolean {
//     //     return this.playerData.currentState === PlayerState.FLYING_DOWN ||
//     //         this.playerData.currentState === PlayerState.FLYING_RIGHT_DOWN ||
//     //         this.playerData.currentState === PlayerState.FLYING_RIGHT ||
//     //         this.playerData.currentState === PlayerState.FLYING_LEFT_DOWN ||
//     //         this.playerData.currentState === PlayerState.FLYING_LEFT;
//     // }

//     /**
//      * Checks if player is in crashed state
//      */
//     // public isCrashed(): boolean {
//     //     return this.playerData.currentState === PlayerState.CRASHED;
//     // }

//     // public isInCollisionState(): boolean {
//     //     return this.playerData.collisionEffect > 0 || this.isFlying() || this.isCrashed();
//     // }
// }