import { Player, PlayerState } from './player/player';
import { ObstacleManager, Obstacle } from './obstacleManager';
import { InputHandler } from './inputHandler';
import p5 from 'p5';
import { SkiTrack } from './skiTrack';
import { Camera } from './camera';
import { World } from './world';
import { CollisionHandler } from './collisionHandler';
import { Position } from './camera';
import { SpriteAtlas } from './spriteAtlas';

// Interface for objects that can be rendered with depth sorting
export interface RenderableObject {
  worldPos: Position;
  render(p: p5, game: Game): void;
  // Optional height property for depth sorting
  height?: number;
}

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
  obstacleManager: ObstacleManager;

  private inputHandler: InputHandler;
  private isPaused: boolean = false;
  private gameState: GameState = GameState.PLAYING; // Default state

  backgroundImage: p5.Image | null = null;
  private spriteSheet: p5.Image | null = null; // Add the missing spriteSheet property

  private assetsLoaded: boolean = false;
  private assetsLoadingFailed: boolean = false;
  skiTrack: SkiTrack; 

  // For handling key press events
  private leftKeyPressed: boolean = false;
  private rightKeyPressed: boolean = false;
  private downKeyPressed: boolean = false;
  private debugKeyPressed: boolean = false;

  public debug: boolean = false;
  backgroundY: number = 0;
  backgroundX: number = 0;
  camera: Camera;
  world: World;
  private collisionHandler: CollisionHandler;
  spriteAtlases: Map<string, SpriteAtlas> = new Map();

  constructor(p: p5) {
    this.p = p;
    this.inputHandler = new InputHandler();
    this.loadAssets();

    this.camera = new Camera(this.p, this);

    this.world = new World(this.p, this.camera, this);

    // Position player at the top middle of the screen, facing down
    // position is world position
    this.player = new Player(this.p, { x: 0, y: 0 }, this);

    this.obstacleManager = new ObstacleManager(this.p, this);
    this.skiTrack = new SkiTrack(this);
    this.collisionHandler = new CollisionHandler(this);

    console.debug("Game initialized. Press 'D' to toggle debug mode");
    this.setupKeyboardControls();
  }

  private loadAssets(): void {
    console.debug("Loading game assets...");

    let assetsToLoad = 2;
    let assetsLoaded = 0;

    // Load background image
    this.p.loadImage('assets/snow.png',
      (img: p5.Image) => {
        this.backgroundImage = img;
        console.debug("Background image loaded:", img.width, "x", img.height);
        assetsLoaded++;
        if (assetsLoaded === assetsToLoad) {
          this.assetsLoaded = true;
          console.debug("All assets loaded successfully");
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
        console.debug("Obstacle spritesheet loaded:", img.width, "x", img.height);
        this.spriteSheet = img; // Save reference to obstacle spritesheet
        this.obstacleManager.setSpriteSheet(img);
        assetsLoaded++;
        if (assetsLoaded === assetsToLoad) {
          this.assetsLoaded = true;
          console.debug("All assets loaded successfully");
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

    // Update player entity
    this.player.update();

    
    
    // Update camera to follow player
    this.camera.update();
    
    // Update world entities
    this.world.update();
    
    // Update obstacles
    this.obstacleManager.update(this);

    // handle collisions
    this.collisionHandler.update(this.player, this.obstacleManager.obstacles);
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
    console.debug(`Debug mode: ${this.debug ? 'ON' : 'OFF'}`);
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

    this.world.render()

    // Render ski tracks BEFORE player and obstacles so they appear underneath
    this.skiTrack.render(this.p);

    // Collect all renderable objects for depth sorting
    const renderableObjects: RenderableObject[] = [];
    
    // Add player to the renderable objects
    renderableObjects.push(this.player);
    
    // Add obstacles to the renderable objects
    this.obstacleManager.obstacles.forEach(obstacle => {
      renderableObjects.push(obstacle);
    });
    
    // Sort objects by their ground position (base Y position) rather than center
    renderableObjects.sort((a, b) => {
      // Calculate base positions for both objects
      // For objects without height property, default to using their center position
      const aBaseY = a.worldPos.y + (a.height ? a.height/2 : 0);
      const bBaseY = b.worldPos.y + (b.height ? b.height/2 : 0);
      
      // Sort by base Y position (smaller Y values first = further away)
      return aBaseY - bBaseY;
    });
    
    // Render objects in Y-order
    for (const object of renderableObjects) {
      if (object === this.player) {
        this.player.render();
      } else {
        // It's an obstacle
        const obstacle = object as Obstacle;
        obstacle.render(this.p, this);
        
        // If debug mode is enabled, draw the collision boxes for obstacles
        if (this.debug) {
          this.obstacleManager.renderObstacleDebugHitbox(obstacle);
        }
      }
    }

    // Show debug info for obstacles
    if (this.debug) {
      this.p.fill(255);
      this.p.textSize(12);
      this.p.textAlign(this.p.LEFT, this.p.TOP);
      this.p.text(`Obstacles: ${this.obstacleManager.obstacles.length}`, 10, 10);
    }

    // Render touch controls on mobile/tablet
    // if (this.isMobileDevice()) {
    //   this.renderTouchControls();
    // }

    // Display controls information
    this.renderControlsInfo();
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
    this.p.text("LEFT/RIGHT: Turn | SPACE: Pause | D: Debug Mode", this.p.width - 10, this.p.height - 10);

    // In debug mode, show more information
    if (this.debug) {
      this.p.textAlign(this.p.LEFT, this.p.TOP);
      this.p.fill(255, 255, 0);
      this.p.text("DEBUG MODE", 10, 30);
      this.p.text(`Player position: (${Math.round(this.player.worldPos.x)}, ${Math.round(this.player.worldPos.y)})`, 10, 50);
      this.p.text(`Player state: ${PlayerState[this.player.getCurrentState()]}`, 10, 70);
      
      // Add collision count and special states
      if (this.player.isFlying()) {
        this.p.fill(255, 0, 255); // Purple for flying
        this.p.text("FLYING!", 10, 90);
      } else if (this.player.isCrashed()) {
        this.p.fill(255, 0, 0); // Red for crashed
        this.p.text("CRASHED!", 10, 90);
      } else {
        this.p.fill(255, 255, 0);
        this.p.text(`Collision: ${this.player.isInCollisionState() ? 'YES' : 'NO'}`, 10, 90);
      }
      
      // Get terrain info at player position for debug display
      if (this.world && this.player) {
        const playerPos = this.player.worldPos;
        const terrainHeight = this.world.getHeightAtPosition(playerPos);
        const slope = this.world.getSlopeAtPosition(playerPos);
        
        this.p.fill(0, 255, 255); // Cyan for terrain info
        this.p.text(`Terrain bumpiness: ${terrainHeight.toFixed(3)}`, 10, 110);
        this.p.text(`Terrain slope: ${(slope.angle * 180 / Math.PI).toFixed(1)}°`, 10, 130);
        this.p.text(`Rotation effect: ${(this.player.getCurrentRotation() * 180 / Math.PI).toFixed(1)}°`, 10, 150);
      }
    }
  }

  // Input handling methods
  public handleKeyPressed(keyCode: number, key: string): void {
    this.inputHandler.setKeyDown(keyCode, key);
  }

  public handleKeyReleased(keyCode: number, key: string): void {
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
        this.debug = !this.debug;
        this.player.toggleDebug();
        this.obstacleManager.toggleDebug();
        console.debug("Debug mode toggled");
      } else if (this.p.key === ' ' || this.p.keyCode === 32) { // Space key
        // Toggle pause
        this.togglePause();
      } else if (this.debug) {
        // Debug mode controls
        if (this.p.key === 'm' || this.p.key === 'M') {
          // Toggle heightmap visualization
          this.world.toggleDebugHeightmap();
        }
      }
    };
  }

  // Start game from menu state
  private startGame(): void {
    this.gameState = GameState.PLAYING;
    this.isPaused = false;
    this.p.loop(); // Ensure game is running
    console.debug("Game started");
  }

  // Reset game after game over
  private resetGame(): void {
    // Reset player position
    this.player = new Player(this.p, { x: 0, y: 0 }, this);

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
    console.debug("Game reset");
  }

  // Toggle pause state
  private togglePause(): void {
    if (this.gameState === GameState.PLAYING) {
      this.gameState = GameState.PAUSED;
      this.isPaused = true;
      this.p.noLoop();
      console.debug("Game paused");
    } else if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      this.isPaused = false;
      this.p.loop();
      console.debug("Game resumed");
    }
  }

  // Handle canvas resize
  public handleResize(newWidth: number, newHeight: number): void {
    // Update any game elements that depend on canvas size
    if (this.camera) {
      this.camera.handleResize(newWidth, newHeight);
    }
    
    // You may need to adjust other game elements based on the new size
    // For example, repositioning UI elements, adjusting view distances, etc.
    console.debug(`Canvas resized to ${newWidth}x${newHeight}`);
  }

  // Load a sprite atlas and store it with the given name
  public loadSpriteAtlas(name: string, jsonPath: string, imagePath?: string): Promise<SpriteAtlas> {
    return new Promise((resolve, reject) => {
      // Check if atlas with this name already exists
      if (this.spriteAtlases.has(name)) {
        console.debug(`Sprite atlas '${name}' already loaded, returning existing instance`);
        resolve(this.spriteAtlases.get(name)!);
        return;
      }
      
      // Create new atlas
      const atlas = new SpriteAtlas(this.p);
      
      // Load the atlas data
      atlas.loadAtlas(jsonPath, imagePath)
        .then(() => {
          // Store in the map
          this.spriteAtlases.set(name, atlas);
          console.debug(`Sprite atlas '${name}' loaded successfully`);
          resolve(atlas);
        })
        .catch(err => {
          console.error(`Failed to load sprite atlas '${name}':`, err);
          reject(err);
        });
    });
  }
  
  // Get a sprite atlas by name
  public getSpriteAtlas(name: string): SpriteAtlas | null {
    return this.spriteAtlases.get(name) || null;
  }
  
  // Preload all common atlases
  public loadAllAtlases(): Promise<void> {
    const promises: Promise<SpriteAtlas>[] = [
      this.loadSpriteAtlas('player', 'assets/player.json', 'assets/player.png'),
      // Add more atlases here as needed:
      // this.loadSpriteAtlas('obstacles', 'assets/obstacles.json')
    ];
    
    return Promise.all(promises).then(() => {
      console.debug('All sprite atlases loaded successfully');
    });
  }
}

