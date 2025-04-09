import p5 from 'p5';
import { Game } from './game';
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

  // For handling key press states
  private leftKeyPressed: boolean = false;
  private rightKeyPressed: boolean = false;
  private downKeyPressed: boolean = false;
  private debugKeyPressed: boolean = false;
  private spaceKeyPressed: boolean = false;

  constructor(p: p5, game: Game) {
    this.p = p;
    this.game = game;
    this.inputHandler = new InputHandler();
    
    // Setup the event handlers
    this.setupKeyboardControls();
  }

  /**
   * Update method called every frame to check for continuous input
   */
  public update(): void {
    // Check for continuous input and state changes
    this.handleContinuousInput();
  }

  /**
   * Handles continuous input checks that need to be evaluated every frame
   * This includes state-based input and key-hold detection
   */
  private handleContinuousInput(): void {
    // Check for pause toggle with spacebar
    if (this.inputHandler.isKeyDown(' ') && !this.spaceKeyPressed) {
      this.spaceKeyPressed = true;
      this.game.togglePause();
    } 
    else if (!this.inputHandler.isKeyDown(' ') && this.spaceKeyPressed) {
      this.spaceKeyPressed = false;
    }
    
    // For continuous turning based on key being held down, uncomment these lines:
    // if (this.inputHandler.isKeyDown(undefined, this.p.LEFT_ARROW)) {
    //   this.game.player.turnLeft();
    // } else if (this.inputHandler.isKeyDown(undefined, this.p.RIGHT_ARROW)) {
    //   this.game.player.turnRight();
    // }
    
    // LEFT arrow key (discrete press handling)
    if (this.inputHandler.isKeyDown(undefined, this.p.LEFT_ARROW) && !this.leftKeyPressed) {
      this.leftKeyPressed = true;
      this.game.player.turnLeft();
    }
    else if (!this.inputHandler.isKeyDown(undefined, this.p.LEFT_ARROW) && this.leftKeyPressed) {
      this.leftKeyPressed = false;
    }

    // RIGHT arrow key (discrete press handling)
    if (this.inputHandler.isKeyDown(undefined, this.p.RIGHT_ARROW) && !this.rightKeyPressed) {
      this.rightKeyPressed = true;
      this.game.player.turnRight();
    }
    else if (!this.inputHandler.isKeyDown(undefined, this.p.RIGHT_ARROW) && this.rightKeyPressed) {
      this.rightKeyPressed = false;
    }

    // 'D' key for debug mode (keyCode 68)
    if (this.inputHandler.isKeyDown('d') || this.inputHandler.isKeyDown('D')) {
      if (!this.debugKeyPressed) {
        this.debugKeyPressed = true;
        this.game.toggleDebug();
      }
    } else {
      this.debugKeyPressed = false;
    }
  }

  /**
   * Sets up event-based keyboard controls
   */
  private setupKeyboardControls(): void {
    this.p.keyPressed = () => {
      // Handle key presses - these are one-time events
      this.handleKeyPressed(this.p.keyCode, this.p.key);
    };
    
    // Handle key releases
    this.p.keyReleased = () => {
      this.handleKeyReleased(this.p.keyCode, this.p.key);
    };
  }

  /**
   * Handles key press events
   */
  private handleKeyPressed(keyCode: number, key: string): void {
    this.inputHandler.setKeyDown(keyCode, key);
    this.handleKeyAction(key, keyCode);
  }

  /**
   * Handles key release events
   */
  private handleKeyReleased(keyCode: number, key: string): void {
    this.inputHandler.setKeyUp(keyCode, key);
  }

  /**
   * Handles specific actions in response to key presses
   * This method centralizes all key-based actions in one place
   */
  private handleKeyAction(key: string, keyCode: number): void {
    // Debug-only actions
    if (this.game.debug) {
      switch (key) {
        case 'm':
        case 'M':
          this.game.world.toggleDebugHeightmap();
          console.debug("Toggled heightmap visualization");
          break;
        case 'w':
        case 'W':
          this.cycleWeatherState();
          break;
        case 'b':
        case 'B':
          this.game.weatherSystem.setWeatherState(WeatherState.BLIZZARD, true);
          console.debug("Sudden blizzard triggered!");
          break;
        case 'r':
        case 'R':
          this.game.resetGame();
          console.debug("Game reset by user");
          break;
      }
    }
    
    // Movement controls - for keys that should trigger on press rather than state
    switch (keyCode) {
      case this.p.LEFT_ARROW:
        this.game.player.turnLeft();
        break;
      case this.p.RIGHT_ARROW:
        this.game.player.turnRight();
        break;
    }
  }
  
  /**
   * Cycles through weather states for testing
   * This is extracted to a separate method to avoid duplicating logic
   */
  private cycleWeatherState(): void {
    switch (this.game.weatherSystem.getCurrentWeatherState()) {
      case WeatherState.CLEAR:
        this.game.weatherSystem.setWeatherState(WeatherState.LIGHT_SNOW);
        break;
      case WeatherState.LIGHT_SNOW:
        this.game.weatherSystem.setWeatherState(WeatherState.HEAVY_SNOW);
        break;
      case WeatherState.HEAVY_SNOW:
        this.game.weatherSystem.setWeatherState(WeatherState.BLIZZARD);
        break;
      case WeatherState.BLIZZARD:
        this.game.weatherSystem.setWeatherState(WeatherState.CLEAR);
        break;
    }
    console.debug("Weather state changed to:", WeatherState[this.game.weatherSystem.getCurrentWeatherState()]);
  }
}