import { Player, PlayerState } from './player';
import { ObstacleManager } from './obstacleManager';
import { InputHandler } from './inputHandler';
import p5 from 'p5';

export interface Touch {
    x: number;
    y: number;
    id: number;
}

export class Game {
  private p: p5;
  private player: Player;
  private obstacleManager: ObstacleManager;
  private inputHandler: InputHandler;
  
  private backgroundImage: p5.Image | null = null;
  private backgroundY: number = 0;
  private backgroundX: number = 0;
  private readonly baseScrollSpeed: number = 5;
  private assetsLoaded: boolean = false;
  private assetsLoadingFailed: boolean = false;
  private debug: boolean = false;
  
  // For handling key press events
  private leftKeyPressed: boolean = false;
  private rightKeyPressed: boolean = false;
  private downKeyPressed: boolean = false;
  private debugKeyPressed: boolean = false;
  
  constructor(p: p5) {
    this.p = p;
    this.inputHandler = new InputHandler();
    this.loadAssets();
    // Position player at the top middle of the screen, facing down
    this.player = new Player(this.p, this.p.width / 2, 150);
    this.obstacleManager = new ObstacleManager(this.p);
    
    // Add console message to help debug
    console.log("Game initialized. Press 'D' to toggle debug mode");
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
  
  public update(): void {
    if (this.assetsLoadingFailed) {
      return; // Don't update if assets failed to load
    }
    
    // Handle inputs and update player direction
    this.handleInput();
    
    // Update game entities
    this.player.update();
    
    // Calculate horizontal movement based on player state
    const horizontalOffset = this.calculateHorizontalOffset();
    
    // Update background position based on player state
    this.backgroundY -= this.getEffectiveScrollSpeed();
    this.backgroundX += horizontalOffset;
    
    // Update obstacles with the same horizontal offset as the background
    this.obstacleManager.update(this.getEffectiveScrollSpeed(), horizontalOffset);
    
    // Only check for collisions if player is not already in collision state
    if (!this.player.isInCollisionState()) {
      const collidedObstacle = this.obstacleManager.checkCollision(this.player);
      if (collidedObstacle) {
        this.player.handleCollision(collidedObstacle);
      }
    }
  }
  
  private handleInput(): void {
    // Check for new key presses
    if (this.inputHandler.isKeyDown(this.p.LEFT_ARROW) && !this.leftKeyPressed) {
      this.leftKeyPressed = true;
      this.player.turnLeft();
    } 
    else if (!this.inputHandler.isKeyDown(this.p.LEFT_ARROW) && this.leftKeyPressed) {
      this.leftKeyPressed = false;
    }
    
    if (this.inputHandler.isKeyDown(this.p.RIGHT_ARROW) && !this.rightKeyPressed) {
      this.rightKeyPressed = true;
      this.player.turnRight();
    }
    else if (!this.inputHandler.isKeyDown(this.p.RIGHT_ARROW) && this.rightKeyPressed) {
      this.rightKeyPressed = false;
    }
    
    if (this.inputHandler.isKeyDown(this.p.DOWN_ARROW) && !this.downKeyPressed) {
      this.downKeyPressed = true;
      this.increaseSpeed();
    }
    else if (!this.inputHandler.isKeyDown(this.p.DOWN_ARROW) && this.downKeyPressed) {
      this.downKeyPressed = false;
    }
    
    // Toggle debug mode with 'D' key
    if (this.inputHandler.isKeyDown(68) && !this.debugKeyPressed) { // 68 is keyCode for 'D'
      this.debugKeyPressed = true;
      this.toggleDebug();
    }
    else if (!this.inputHandler.isKeyDown(68) && this.debugKeyPressed) {
      this.debugKeyPressed = false;
    }
  }
  
  private toggleDebug(): void {
    this.debug = !this.debug;
    this.obstacleManager.toggleDebug();
    this.player.toggleDebug();
    console.log(`Debug mode: ${this.debug ? 'ON' : 'OFF'}`);
  }
  
  private calculateHorizontalOffset(): number {
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
  
  private getEffectiveScrollSpeed(): number {
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
    // Temporarily increase scroll speed with down arrow (only if not in collision)
    if (!this.player.isInCollisionState()) {
      this.backgroundY -= 10;
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
    
    // Draw the background with seamless tiling, incorporating X and Y movement
    for (let x = -bgWidth + (this.backgroundX % bgWidth); x < this.p.width + bgWidth; x += bgWidth) {
      for (let y = -bgHeight + (this.backgroundY % bgHeight); y < this.p.height + bgHeight; y += bgHeight) {
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
      this.p.text(`Player position: (${Math.round(this.player.getX())}, ${Math.round(this.player.getY())})`, 10, 50);
      this.p.text(`Player state: ${PlayerState[this.player.getCurrentState()]}`, 10, 70);
      this.p.text(`Collision: ${this.player.isInCollisionState() ? 'YES' : 'NO'}`, 10, 90);
    }
  }
  
  // Input handling methods
  public handleKeyPressed(keyCode: number): void {
    this.inputHandler.setKeyDown(keyCode);
  }
  
  public handleKeyReleased(keyCode: number): void {
    this.inputHandler.setKeyUp(keyCode);
  }
}