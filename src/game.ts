import { Player, PlayerState } from './player';
import { ObstacleManager } from './obstacleManager';
import { InputHandler } from './inputHandler';
import p5 from 'p5';
import { SkiTrack } from './skiTrack';

export enum GameState {
  MENU,
  PLAYING,
  PAUSED,
  GAME_OVER
}

export interface Touch {
    x: number;
    y: number;
    id: number;
}

export class Game {
  private p: p5;
  player: Player;
  private obstacleManager: ObstacleManager;
  private inputHandler: InputHandler;
  private isPaused: boolean = false;
  private gameState: GameState = GameState.PLAYING; // Default state
  
  backgroundImage: p5.Image | null = null;
  private spriteSheet: p5.Image | null = null; // Add the missing spriteSheet property
  
  private readonly baseScrollSpeed: number = 5;
  private assetsLoaded: boolean = false;
  private assetsLoadingFailed: boolean = false;
  private skiTrack: SkiTrack; // Add SkiTrack instance
  
  // For handling key press events
  private leftKeyPressed: boolean = false;
  private rightKeyPressed: boolean = false;
  private downKeyPressed: boolean = false;
  private debugKeyPressed: boolean = false;

  // World and viewport variables
  private worldX: number = 0;  // World X position of the camera
  private worldY: number = 0;  // World Y position of the camera
  private playerWorldX: number = 0; // Player's position in world coordinates
  private playerWorldY: number = 0; // Player's position in world coordinates

  public debug: boolean = false;
  backgroundY: number = 0;
  backgroundX: number = 0;
  
  constructor(p: p5) {
    this.p = p;
    this.inputHandler = new InputHandler();
    this.loadAssets();
    
    // Position player at the top middle of the screen, facing down
    // Screen position is fixed, but we'll track world position separately
    this.player = new Player(this.p, this.p.width / 2, 150);
    
    // Initialize player's world position
    this.playerWorldX = this.p.width / 2;
    this.playerWorldY = 150;
    
    this.obstacleManager = new ObstacleManager(this.p, this);
    this.skiTrack = new SkiTrack(this);
    
    console.log("Game initialized. Press 'D' to toggle debug mode");
    this.setupKeyboardControls();
  }
  
  private loadAssets(): void {
    console.log("Loading game assets...");
    
    let assetsToLoad = 2;
    let assetsLoaded = 0;
    
    // Load background image
    this.p.loadImage('assets/snow.png', 
      (img: p5.Image) => {
        this.backgroundImage = img;
        console.log("Background image loaded:", img.width, "x", img.height);
        assetsLoaded++;
        if (assetsLoaded === assetsToLoad) {
          this.assetsLoaded = true;
          console.log("All assets loaded successfully");
        }
      },
      (err) => {
        console.error('Failed to load snow.png:', err);
        this.assetsLoadingFailed = true;
      }
    );
    
    // Load obstacle spritesheet
    this.p.loadImage('assets/obstacles.png', 
      (img: p5.Image) => {
        console.log("Obstacle spritesheet loaded:", img.width, "x", img.height);
        this.spriteSheet = img; // Save reference to obstacle spritesheet
        this.obstacleManager.setSpriteSheet(img);
        assetsLoaded++;
        if (assetsLoaded === assetsToLoad) {
          this.assetsLoaded = true;
          console.log("All assets loaded successfully");
        }
      },
      (err) => {
        console.error('Failed to load obstacles.png:', err);
        this.assetsLoadingFailed = true;
      }
    );
  }
  
  // Convert world coordinates to screen coordinates
  public worldToScreen(worldX: number, worldY: number): {x: number, y: number} {
    return {
      x: worldX - this.worldX + this.p.width / 2,
      y: worldY - this.worldY + this.p.height / 2
    };
  }
  
  // Convert screen coordinates to world coordinates
  public screenToWorld(screenX: number, screenY: number): {x: number, y: number} {
    return {
      x: screenX + this.worldX - this.p.width / 2,
      y: screenY + this.worldY - this.p.height / 2
    };
  }
  
  // Get player's world position
  public getPlayerWorldX(): number {
    return this.playerWorldX;
  }
  
  public getPlayerWorldY(): number {
    return this.playerWorldY;
  }
  
  // Get current camera world position
  public getWorldX(): number {
    return this.worldX;
  }
  
  public getWorldY(): number {
    return this.worldY;
  }
  
  public update(): void {
    if (this.assetsLoadingFailed) {
      return; // Don't update if assets failed to load
    }
    
    // Handle inputs and update player direction
    this.handleInput();
    
    // Update player entity (screen position stays fixed)
    this.player.update();
    
    // Calculate horizontal movement based on player state
    const horizontalOffset = this.calculateHorizontalOffset();
    
    // Update player's world position based on direction
    this.playerWorldX += horizontalOffset;
    this.playerWorldY += this.getEffectiveScrollSpeed();
    
    // Update camera position to follow player in world space
    this.worldX = this.playerWorldX - this.p.width / 2;
    this.worldY = this.playerWorldY - 150; // Keep player at y=150 on screen
    
    // Update background reference positions for parallax effect
    this.backgroundY = this.worldY
    this.backgroundX = this.worldX
    
    // Update obstacles in world space - pass the entire game object
    this.obstacleManager.update(this);
    
    // Add point to ski track if player is moving
    if (this.getEffectiveScrollSpeed() > 0 && !this.player.isInCollisionState()) {
      this.skiTrack.addPoint(this.playerWorldX, this.playerWorldY);
    }
    
    // Only check for collisions if player is not already in collision state
    if (!this.player.isInCollisionState()) {
      const collidedObstacle = this.obstacleManager.checkCollision(
        this.playerWorldX, 
        this.playerWorldY, 
        this.player
      );
      if (collidedObstacle) {
        this.player.handleCollision(collidedObstacle);
      }
    }
  }
  
  private handleInput(): void {
    // pause game if 'SPACE' is pressed
    if (this.inputHandler.isKeyDown(' ') && !this.isPaused) {
      this.p.noLoop();
      this.isPaused = true;
    }
    else if (this.inputHandler.isKeyDown(' ') && this.isPaused) {
      this.p.loop();
      this.isPaused = false;
    }
    // Check for new key presses
    if (this.inputHandler.isKeyDown(undefined, this.p.LEFT_ARROW) && !this.leftKeyPressed) {
      this.leftKeyPressed = true;
      this.player.turnLeft();
    } 
    else if (!this.inputHandler.isKeyDown(undefined, this.p.LEFT_ARROW) && this.leftKeyPressed) {
      this.leftKeyPressed = false;
    }
    
    if (this.inputHandler.isKeyDown(undefined, this.p.RIGHT_ARROW) && !this.rightKeyPressed) {
      this.rightKeyPressed = true;
      this.player.turnRight();
    }
    else if (!this.inputHandler.isKeyDown(undefined, this.p.RIGHT_ARROW) && this.rightKeyPressed) {
      this.rightKeyPressed = false;
    }
    
    if (this.inputHandler.isKeyDown(undefined, this.p.DOWN_ARROW) && !this.downKeyPressed) {
      this.downKeyPressed = true;
      this.increaseSpeed();
    }
    else if (!this.inputHandler.isKeyDown(undefined, this.p.DOWN_ARROW) && this.downKeyPressed) {
      this.downKeyPressed = false;
    }
    
    // Toggle debug mode with 'D' key
    if (this.inputHandler.isKeyDown(undefined, 68) && !this.debugKeyPressed) { // 68 is keyCode for 'D'
      this.debugKeyPressed = true;
      this.toggleDebug();
    }
    else if (!this.inputHandler.isKeyDown(undefined, 68) && this.debugKeyPressed) {
      this.debugKeyPressed = false;
    }
  }
  
  private toggleDebug(): void {
    this.debug = !this.debug;
    this.obstacleManager.toggleDebug();
    this.player.toggleDebug();
    console.log(`Debug mode: ${this.debug ? 'ON' : 'OFF'}`);
  }
  
  public calculateHorizontalOffset(): number {
    // Calculate horizontal movement based on player state
    const playerState = this.player.getCurrentState();
    let horizontalOffset = 0;
    
    switch (playerState) {
      case PlayerState.LEFT:
        horizontalOffset = 2.0;
        break;
      case PlayerState.LEFT_DOWN:
        horizontalOffset = 1.0;
        break;
      case PlayerState.DOWN:
        horizontalOffset = 0;
        break;
      case PlayerState.RIGHT_DOWN:
        horizontalOffset = -1.0;
        break;
      case PlayerState.RIGHT:
        horizontalOffset = -2.0;
        break;
    }
    
    return horizontalOffset;
  }
  
  public getEffectiveScrollSpeed(): number {
    // Get base speed affected by player state
    const playerState = this.player.getCurrentState();
    let speedMultiplier = 1.0;
    
    // Player moves faster when directly downhill
    if (playerState === PlayerState.DOWN) {
      speedMultiplier = 1.2;
    } 
    // Slightly slower when angled
    else if (playerState === PlayerState.RIGHT_DOWN || playerState === PlayerState.LEFT_DOWN) {
      speedMultiplier = 1.0;
    }
    // Much slower when fully sideways
    else if (playerState === PlayerState.RIGHT || playerState === PlayerState.LEFT) {
      speedMultiplier = 0.7;
    }
    
    // Reduce speed during collision
    if (this.player.isInCollisionState()) {
      speedMultiplier *= 0.3; // Significant slowdown on collision
    }
    
    return this.baseScrollSpeed * speedMultiplier;
  }
  
  private increaseSpeed(): void {
    // Temporarily increase player's world speed
    if (!this.player.isInCollisionState()) {
      this.playerWorldY += 10; // Move player forward in world
      this.obstacleManager.setTemporarySpeedBoost(true);
    }
  }
  
  public render(): void {
    this.p.background(135, 206, 235); // Sky blue background
    
    if (this.assetsLoadingFailed) {
      this.renderLoadingError();
      return;
    }
    
    if (!this.assetsLoaded) {
      this.renderLoadingScreen();
      return;
    }
    
    // Render scrolling background
    if (this.backgroundImage) {
      this.renderScrollingBackground();
    }
    
    // Render ski tracks BEFORE player and obstacles so they appear underneath
    this.skiTrack.render(this.p);
    
    // Render game entities
    this.obstacleManager.render();
    this.player.render();
    
    // Render touch controls on mobile/tablet
    if (this.isMobileDevice()) {
      this.renderTouchControls();
    }
    
    // Display controls information
    this.renderControlsInfo();
  }
  
  private renderScrollingBackground(): void {
    if (!this.backgroundImage) return;
    
    // Calculate how many tiles we need to cover the screen
    const bgWidth = this.backgroundImage.width;
    const bgHeight = this.backgroundImage.height;
    
    // FIXED: Invert the Y component for upward scrolling background
    // We need to multiply by -0.8 instead of 0.8 for parallax effect
    const bgOffsetY = -(this.worldY) % bgHeight;
    const bgOffsetX = (this.worldX) % bgWidth;
    
    // Draw the background with seamless tiling and correct direction for movement
    for (let x = -bgWidth + bgOffsetX; x < this.p.width + bgWidth; x += bgWidth) {
      for (let y = -bgHeight + bgOffsetY; y < this.p.height + bgHeight; y += bgHeight) {
        this.p.image(this.backgroundImage, x, y);
      }
    }
  }
  
  private renderTouchControls(): void {
    // Simple visualization of touch zones
    this.p.noFill();
    this.p.stroke(255, 255, 255, 100);
    
    // Left control area
    this.p.rect(0, 0, this.p.width / 3, this.p.height);
    
    // Right control area
    this.p.rect(this.p.width * 2 / 3, 0, this.p.width / 3, this.p.height);
    
    // Speed boost area
    this.p.rect(0, this.p.height * 2 / 3, this.p.width, this.p.height / 3);
  }
  
  private renderLoadingScreen(): void {
    this.p.fill(255);
    this.p.textSize(24);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text('Loading assets...', this.p.width / 2, this.p.height / 2);
  }
  
  private renderLoadingError(): void {
    this.p.fill(255, 0, 0);
    this.p.textSize(18);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text('Failed to load game assets.', this.p.width / 2, this.p.height / 2 - 20);
    this.p.text('Please check that the asset files are in the correct location.', this.p.width / 2, this.p.height / 2 + 20);
    
    // Display more detailed error info in debug mode
    if (this.debug) {
      this.p.textSize(12);
      this.p.text('Check the console (F12) for detailed error information.', this.p.width / 2, this.p.height / 2 + 60);
    }
  }
  
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  private renderControlsInfo(): void {
    this.p.fill(255);
    this.p.textSize(12);
    this.p.textAlign(this.p.RIGHT, this.p.BOTTOM);
    this.p.text("LEFT/RIGHT: Turn | DOWN: Speed Boost | D: Debug Mode", this.p.width - 10, this.p.height - 10);
    
    // In debug mode, show more information
    if (this.debug) {
      this.p.textAlign(this.p.LEFT, this.p.TOP);
      this.p.fill(255, 255, 0);
      this.p.text("DEBUG MODE", 10, 30);
      this.p.text(`Player position: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`, 10, 50);
      this.p.text(`Player state: ${PlayerState[this.player.getCurrentState()]}`, 10, 70);
      this.p.text(`Collision: ${this.player.isInCollisionState() ? 'YES' : 'NO'}`, 10, 90);
    }
  }
  
  // Input handling methods
  public handleKeyPressed(keyCode: number, key:string): void {
    this.inputHandler.setKeyDown(keyCode, key);
  }
  
  public handleKeyReleased(keyCode: number, key:string): void {
    this.inputHandler.setKeyUp(keyCode, key);
  }

  private setupKeyboardControls(): void {
    this.p.keyPressed = () => {
      if (this.p.keyCode === this.p.LEFT_ARROW) {
        this.player.turnLeft();
      } else if (this.p.keyCode === this.p.RIGHT_ARROW) {
        this.player.turnRight();
      } else if (this.p.keyCode === this.p.ENTER || this.p.keyCode === this.p.RETURN) {
        // Start the game if it's in menu mode
        if (this.gameState === GameState.MENU) {
          this.startGame();
        }
        // Restart the game if it's in game over state
        else if (this.gameState === GameState.GAME_OVER) {
          this.resetGame();
        }
      } else if (this.p.key === 'd' || this.p.key === 'D') {
        // Toggle debug mode
        this.player.toggleDebug();
        this.obstacleManager.toggleDebug();
        console.log("Debug mode toggled");
      } else if (this.p.key === ' ' || this.p.keyCode === 32) { // Space key
        // Toggle pause
        this.togglePause();
      }
    };
  }

  // Start game from menu state
  private startGame(): void {
    this.gameState = GameState.PLAYING;
    this.isPaused = false;
    this.p.loop(); // Ensure game is running
    console.log("Game started");
  }

  // Reset game after game over
  private resetGame(): void {
    // Reset player position
    this.player = new Player(this.p, this.p.width / 2, 150);
    
    // Clear obstacles
    this.obstacleManager = new ObstacleManager(this.p, this);
    if (this.spriteSheet) {
      this.obstacleManager.setSpriteSheet(this.spriteSheet);
    }
    
    // Reset ski tracks
    this.skiTrack = new SkiTrack(this);
    
    // Reset game state
    this.gameState = GameState.PLAYING;
    this.isPaused = false;
    this.backgroundY = 0;
    this.backgroundX = 0;
    
    this.p.loop(); // Ensure game is running
    console.log("Game reset");
  }

  // Toggle pause state
  private togglePause(): void {
    if (this.gameState === GameState.PLAYING) {
      this.gameState = GameState.PAUSED;
      this.isPaused = true;
      this.p.noLoop();
      console.log("Game paused");
    } else if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      this.isPaused = false;
      this.p.loop();
      console.log("Game resumed");
    }
  }
}

