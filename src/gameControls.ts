import p5 from 'p5';
import { Game, GameState, Touch } from './game';
import { InputHandler } from './inputHandler';
import { WeatherState } from './weather/weatherSystem';

/**
 * GameControls manages all input handling for the ski game
 * It separates input handling from game logic to improve organization
 */
export class GameControls {
    private p: p5;
    private game: Game;
    private inputHandler: InputHandler;

    // Key mapping flags
    private leftKey: boolean = false;
    private rightKey: boolean = false;
    private downKey: boolean = false;
    private upKey: boolean = false;
    
    // Speed control settings
    private speedControlUpdateRate: number = 10; // Frames between speed updates when holding key (reduced from 30)
    private speedControlTimer: number = 0;
    private speedChangeAmount: number = 1.0; // Updated to match what we're using in update method

    // Touch input tracking
    private activeTouches: Map<number, Touch> = new Map();

    // For handling key press states
    private debugKeyPressed: boolean = false;
    private spaceKeyPressed: boolean = false;

    constructor(p: p5, game: Game) {
        this.p = p;
        this.game = game;
        this.inputHandler = new InputHandler();

        // Handle keyboard input
        this.p.keyPressed = this.handleKeyPressed.bind(this);
        this.p.keyReleased = this.handleKeyReleased.bind(this);

        // Handle touch input
        // if (this.p.touchStarted) this.p.touchStarted = this.handleTouchStart.bind(this);
        // if (this.p.touchMoved) this.p.touchMoved = this.handleTouchMove.bind(this);
        // if (this.p.touchEnded) this.p.touchEnded = this.handleTouchEnd.bind(this);
    }

    /**
     * Update method called every frame to check for continuous input
     */
    public update(): void {
        // Handle continuous key input for movement
        if (this.leftKey) {
            this.game.player.turnLeft();
        }

        if (this.rightKey) {
            this.game.player.turnRight();
        }
        
        // Handle speed control with up/down keys (with a rate limiter)
        if ((this.upKey || this.downKey) && this.speedControlTimer <= 0) {
            const baseDifficulty = this.game.difficultyManager.getDifficultyLevel();
            const baseSpeed = this.game.difficultyManager.getPlayerSpeed();
            
            if (this.downKey) {
                // Increase player speed directly
                this.game.player.increaseSpeed(this.speedChangeAmount);
                console.debug(`Speed increased: Offset=${this.game.player.getSpeedOffset().toFixed(2)}, Base=${baseSpeed.toFixed(2)} (${baseDifficulty}% difficulty)`);
            } else if (this.upKey) {
                // Decrease player speed directly
                this.game.player.decreaseSpeed(this.speedChangeAmount);
                console.debug(`Speed decreased: Offset=${this.game.player.getSpeedOffset().toFixed(2)}, Base=${baseSpeed.toFixed(2)} (${baseDifficulty}% difficulty)`);
            }
            
            // Reset timer to prevent too-rapid changes
            this.speedControlTimer = this.speedControlUpdateRate;
        }
        
        // Update speed control timer
        if (this.speedControlTimer > 0) {
            this.speedControlTimer--;
        }

        // Handle touch input for movement
        if (this.activeTouches.size > 0) {
            // Simple touch controls - touches on left half of screen turn left, 
            // touches on right half turn right
            const screenMiddle = this.p.width / 2;

            for (const touch of this.activeTouches.values()) {
                if (touch.x < screenMiddle - 20) { // Add a small deadzone in the middle
                    this.game.player.turnLeft();
                } else if (touch.x > screenMiddle + 20) {
                    this.game.player.turnRight();
                }
            }
        }
    }

    private handleKeyPressed(): any {
        // Store key state
        if (this.p.keyCode === this.p.LEFT_ARROW) {
            this.leftKey = true;
        } else if (this.p.keyCode === this.p.RIGHT_ARROW) {
            this.rightKey = true;
        } else if (this.p.keyCode === this.p.DOWN_ARROW) {
            this.downKey = true;
        } else if (this.p.keyCode === this.p.UP_ARROW) {
            this.upKey = true;
        }

        // One-time key actions
        if (this.p.keyCode === 32) { // SPACE for pause
            this.game.togglePause();
        } else if (this.p.key === 'r' || this.p.key === 'R') {
            // Restart game when in game over state
            if (this.game.getGameState() === GameState.GAME_OVER) {
                this.game.resetGame();
            }
        } else if (this.p.key === 'd' || this.p.key === 'D') {
            this.game.toggleDebug();
        }

        // Removing +/- key controls for difficulty as they're now handled by UP/DOWN arrows
        
        // Weather control keys (for testing)
        else if (this.p.key === '1') {
            this.game.weatherSystem.setWeatherState(WeatherState.CLEAR);
            console.debug("Weather set to CLEAR");
        } else if (this.p.key === '2') {
            this.game.weatherSystem.setWeatherState(WeatherState.LIGHT_SNOW);
            console.debug("Weather set to LIGHT_SNOW");
        } else if (this.p.key === '3') {
            this.game.weatherSystem.setWeatherState(WeatherState.HEAVY_SNOW);
            console.debug("Weather set to HEAVY_SNOW");
        } else if (this.p.key === '4') {
            this.game.weatherSystem.setWeatherState(WeatherState.BLIZZARD);
            console.debug("Weather set to BLIZZARD");
        }

        // Turn off default behaviors for arrow keys and space bar
        if (
            this.p.keyCode === this.p.LEFT_ARROW ||
            this.p.keyCode === this.p.RIGHT_ARROW ||
            this.p.keyCode === this.p.DOWN_ARROW ||
            this.p.keyCode === this.p.UP_ARROW ||
            this.p.keyCode === 32  // space bar
        ) {
            return false;  // prevent default
        }
    }

    private handleKeyReleased(): void {
        if (this.p.keyCode === this.p.LEFT_ARROW) {
            this.leftKey = false;
        } else if (this.p.keyCode === this.p.RIGHT_ARROW) {
            this.rightKey = false;
        } else if (this.p.keyCode === this.p.DOWN_ARROW) {
            this.downKey = false;
        } else if (this.p.keyCode === this.p.UP_ARROW) {
            this.upKey = false;
        }
    }

    // NOTE: ignore touch based input for now, as we can take that later
}