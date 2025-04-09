import { Player, PlayerState } from './player/player';
import { ObstacleManager, Obstacle } from './obstacleManager';
import p5 from 'p5';
import { SkiTrack } from './skiTrack';
import { Camera } from './camera';
import { World } from './world';
import { CollisionHandler } from './collisionHandler';
import { Position } from './camera';
import { SpriteAtlas } from './spriteAtlas';
import { WeatherState, WeatherSystem } from './weather/weatherSystem';
import { GameControls } from './gameControls';

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
  weatherSystem: WeatherSystem;
  private weatherState: WeatherState = WeatherState.CLEAR;

  player: Player;
  obstacleManager: ObstacleManager;

  private isPaused: boolean = false;
  private gameState: GameState = GameState.PLAYING; // Default state

  backgroundImage: p5.Image | null = null;
  private spriteSheet: p5.Image | null = null; // Add the missing spriteSheet property

  private assetsLoaded: boolean = false;
  private assetsLoadingFailed: boolean = false;
  skiTrack: SkiTrack;

  public debug: boolean = false;
  backgroundY: number = 0;
  backgroundX: number = 0;
  camera: Camera;
  world: World;
  private collisionHandler: CollisionHandler;
  spriteAtlases: Map<string, SpriteAtlas> = new Map();

  // Game controls instance
  private gameControls: GameControls;

  constructor(p: p5) {
    this.p = p;
    this.loadAssets();
    
    this.camera = new Camera(this.p, this);
    this.world = new World(this.p, this.camera, this);

    // Position player at the top middle of the screen, facing down
    this.player = new Player(this.p, { x: 0, y: 0 }, this);

    this.obstacleManager = new ObstacleManager(this.p, this);
    this.skiTrack = new SkiTrack(this);
    this.collisionHandler = new CollisionHandler(this);
    this.weatherSystem = new WeatherSystem(this.p, this);
    
    // Initialize game controls
    this.gameControls = new GameControls(this.p, this);
    
    console.debug("Game initialized. Press 'D' to toggle debug mode");
  }

  private loadAssets(): void {
    console.debug("Loading game assets...");

    let assetsToLoad = 1; // Reduced from 2 to 1 since ObstacleManager loads its own assets
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

    // No need to load obstacle spritesheet here anymore 
    // as ObstacleManager handles its own asset loading via SpriteAtlas
  }

  public update(): void {
    if (this.assetsLoadingFailed) {
      return; // Don't update if assets failed to load
    }

    // Always update game controls regardless of pause state
    // This ensures we can detect unpause key presses
    this.gameControls.update();

    // Only update game elements if the game is not paused
    if (!this.isPaused) {
      // Update player entity
      this.player.update();

      // Update weather system
      this.weatherSystem.update();

      // Update camera to follow player
      this.camera.update();

      // Update world entities
      this.world.update();

      // Update obstacles
      this.obstacleManager.update(this);

      // handle collisions
      this.collisionHandler.update(this.player, this.obstacleManager.obstacles);
    }
  }

  public toggleDebug(): void {
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

    // render objects based on their depth
    this.renderDynamicObjects();

    // Render weather effects AFTER everything else
    this.weatherSystem.render();

    // Show pause indicator
    if (this.isPaused) {
      this.renderPauseIndicator();
    }

    // Show debug info for obstacles
    if (this.debug) {
      this.p.fill(255);
      this.p.textSize(12);
      this.p.textAlign(this.p.LEFT, this.p.TOP);
      this.p.text(`Obstacles: ${this.obstacleManager.obstacles.length}`, 10, 10);
      this.p.text(`Weather: ${WeatherState[this.weatherSystem.getCurrentWeatherState()]}`, 10, 290);
      this.p.text(`Visibility: ${(100 - this.weatherSystem.getVisibilityFactor() * 100).toFixed(0)}%`, 10, 310);
    }

    // Display controls information
    this.renderControlsInfo();
  }

  private renderDynamicObjects(): void {
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
      const aBaseY = a.worldPos.y + (a.height ? a.height / 2 : 0);
      const bBaseY = b.worldPos.y + (b.height ? b.height / 2 : 0);

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

  // Show pause indicator
  private renderPauseIndicator(): void {
    this.p.fill(255, 255, 255, 150); // Semi-transparent white
    this.p.rect(0, 0, this.p.width, this.p.height);
    this.p.fill(0);
    this.p.textSize(32);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text("PAUSED", this.p.width / 2, this.p.height / 2);
    this.p.textSize(16);
    this.p.text("Press SPACE to resume", this.p.width / 2, this.p.height / 2 + 40);
  }

  // Start game from menu state
  private startGame(): void {
    this.gameState = GameState.PLAYING;
    this.isPaused = false;
    this.p.loop(); // Ensure game is running
    console.debug("Game started");
  }

  // Reset game after game over
  public resetGame(): void {
    // Reset player position
    this.player = new Player(this.p, { x: 0, y: 0 }, this);

    // Create a new obstacle manager which will load its own assets
    this.obstacleManager = new ObstacleManager(this.p, this);

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
  public togglePause(): void {
    if (this.gameState === GameState.PLAYING) {
      this.gameState = GameState.PAUSED;
      this.isPaused = true;
      console.debug("Game paused");
    } else if (this.gameState === GameState.PAUSED) {
      this.gameState = GameState.PLAYING;
      this.isPaused = false;
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
      this.loadSpriteAtlas('obstacles', 'assets/obstacles.json', 'assets/obstacles.png')
    ];

    return Promise.all(promises).then(() => {
      console.debug('All sprite atlases loaded successfully');
    });
  }
}

