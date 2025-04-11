import { Player } from './player/player';
import { EntityManager } from './entityManager';
import p5 from 'p5';
import { Camera } from './camera';
import { World } from './world';
import { Position } from './camera';
import { SpriteAtlas } from './spriteAtlas';
import { WeatherState, WeatherSystem } from './weather/weatherSystem';
import { GameControls } from './gameControls';
import { DifficultyManager } from './difficultyManager';
import { CollisionSystem } from './collision/CollisionSystem';
import { ICollidable } from './collision/ICollidable';
import { GameRenderer } from './game.renderer';

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
  protected p: p5;
  debug: boolean = false;
  weatherSystem: WeatherSystem;
  difficultyManager: DifficultyManager; // Add the difficulty manager
  private weatherState: WeatherState = WeatherState.CLEAR;
  player: Player;
  entityManager: EntityManager; // Renamed from obstacleManager to entityManager

  private isPaused: boolean = false;
  private gameState: GameState = GameState.PLAYING; // Default state

  backgroundImage: p5.Image | null = null;
  private spriteSheet: p5.Image | null = null; // Add the missing spriteSheet property

  private assetsLoaded: boolean = false;
  private assetsLoadingFailed: boolean = false;
  camera: Camera;
  world: World;
  private collisionSystem: CollisionSystem; // Only the new collision system
  spriteAtlases: Map<string, SpriteAtlas> = new Map();

  // Game controls instance
  private gameControls: GameControls;

  // Track time since crash to show game over screen after a short delay
  private crashedTimeCounter: number = 0;
  private readonly gameOverDelay: number = 60; // Show game over screen after 1 second (60 frames at 60fps)

  constructor(p: p5) {
    this.p = p;
    this.loadAssets();

    this.camera = new Camera(this.p, this);
    this.world = new World(this.p, this.camera, this);

    // Position player at the top middle of the screen, facing down
    this.player = new Player(this.p, { x: 0, y: 0 }, this);    // Create the difficulty manager
    this.difficultyManager = new DifficultyManager(this);
    
    this.entityManager = new EntityManager(this.p, this);
    this.collisionSystem = new CollisionSystem(this); // Initialize only the new collision system
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

    // Only update game elements if the game is not paused and not game over
    if (!this.isPaused && this.gameState !== GameState.GAME_OVER) {
      // Update the difficulty manager
      this.difficultyManager.update();

      
      // Update player entity
      this.player.update();

      // Check for game over conditions
      this.checkGameOverConditions();

      // Update weather system
      this.weatherSystem.update();

      // Update camera to follow player
      this.camera.update();      // Update world entities
      this.world.update();

      // Update all game entities (obstacles and AI skiers)
      this.entityManager.update(this);

      // Use the new collision system
      // Collect all collidable objects into a single array
      // Filter entities to ensure they implement ICollidable properly
      const collidables: ICollidable[] = [
        this.player, 
        ...this.entityManager.getAllEntities()
          .filter(entity => {
            // Check if entity has required ICollidable properties
            if (!('type' in entity)) return false;
            const type = entity.type as string;
            // Only include compatible collision types
            return ['tree', 'rock', 'snowman', 'aiSkier', 'player'].includes(type);
          }) as ICollidable[]
      ];
      
      // Process collisions using the system
      this.collisionSystem.update(collidables);
    }
  }

  // Check if game over conditions are met
  private checkGameOverConditions(): void {
    // Check if player is currently in a crashed state
    if (this.player.isCrashed()) {
      // Increment crash timer
      this.crashedTimeCounter++;
      
      // Wait for the delay before showing game over screen
      if (this.crashedTimeCounter >= this.gameOverDelay) {
        this.setGameOver();
        return;
      }
    } else {
      // Reset timer if player is not crashed
      this.crashedTimeCounter = 0;
    }
  
    // Or when player has completed the trail (100% progress)
    const trailProgress = this.difficultyManager.getTrailProgress();
    if (trailProgress >= 100) {
      this.setGameOver();
      return;
    }
  }

  // Set the game state to game over
  public setGameOver(): void {
    if (this.gameState !== GameState.GAME_OVER) {
      this.gameState = GameState.GAME_OVER;
      console.debug("Game over!");
    }
  }

  public toggleDebug(): void {
    this.debug = !this.debug;
    this.entityManager.toggleDebug();
    this.player.toggleDebug();
    console.debug(`Debug mode: ${this.debug ? 'ON' : 'OFF'}`);
  }

  public render(): void {
    // GameRenderer.render(this); // Call the static render method
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

    // render objects based on their depth
    this.renderDynamicObjects();

    // Render weather effects AFTER everything else
    this.weatherSystem.render();

    // Show pause indicator if paused
    if (this.isPaused) {
      this.renderPauseIndicator();
    }

    // Show game over screen if game is over
    if (this.gameState === GameState.GAME_OVER) {
      this.renderGameOverScreen();
    }

    // Show debug info in a consolidated panel
    if (this.debug) {
      this.renderDebugPanel();
    }

    // Display controls information
    this.renderControlsInfo();
  }

  private renderDynamicObjects(): void {
    // First render snowdrifts which should be at ground level
    this.renderSnowdrifts();
    
    // Then render all ski tracks which should be on top of snowdrifts
    this.renderAllSkiTracks();
    
    // Create a combined array of all renderable objects including the player
    // But exclude snowdrifts as they're already rendered
    const allRenderableObjects: RenderableObject[] = [
      ...this.entityManager.getAllEntities().filter(entity => 
        !('type' in entity) || (entity as any).type !== 'snowdrift'),
      this.player
    ];
    
    // Sort all objects by Y position for proper depth rendering
    // Objects with smaller Y values (higher up on the screen) render first (appear behind)
    allRenderableObjects.sort((a, b) => a.worldPos.y - b.worldPos.y);
    
    // Render all objects in the sorted order
    for (const obj of allRenderableObjects) {
      obj.render(this.p, this);
    }
  }
  
  /**
   * Renders snowdrifts separately before ski tracks for proper layering
   */
  private renderSnowdrifts(): void {
    // Get all obstacles from entity manager
    const obstacles = this.entityManager.getObstacles();
    
    // Filter out only snowdrifts and render them
    const snowdrifts = obstacles.filter(obs => 'type' in obs && obs.type === 'snowdrift');
    
    for (const snowdrift of snowdrifts) {
      snowdrift.render(this.p, this);
    }
  }

  /**
   * Renders all ski tracks from all entities (player and AI skiers)
   * Ski tracks should always be rendered before entities for proper layering
   */
  private renderAllSkiTracks(): void {
    // Render player ski tracks
    this.player.renderSkiTracksOnly(this.p, this);

    // Render AI skier tracks using the EntityManager
    const aiSkiers = this.entityManager.getAllSkierEntities();
    
    for (const skier of aiSkiers) {
      if ('renderSkiTracksOnly' in skier && typeof skier.renderSkiTracksOnly === 'function') {
        skier.renderSkiTracksOnly(this.p, this);
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
    this.p.text("LEFT/RIGHT: Turn | UP/DOWN: Adjust Speed | SPACE: Pause | D: Debug Mode", this.p.width - 10, this.p.height - 10);

    // Always show difficulty level even when not in debug mode
    this.renderDifficultyIndicator();
  }

  private renderDifficultyIndicator(): void {
    // Get trail progress and current section
    const trailProgress = this.difficultyManager.getTrailProgress();
    const sectionName = this.difficultyManager.getCurrentSectionName();

    // Save the current transformation state
    // this.p.push();

    // Reset any translations that might be in effect
    // this.p.resetMatrix();

    // Force text to render at integer pixel positions
    this.p.textAlign(this.p.LEFT, this.p.TOP);
    this.p.textSize(12);

    // Ensure container rect is at integer pixel position
    const boxX = Math.floor(this.p.width - 210);
    const boxY = Math.floor(10);
    const boxWidth = 200;
    const boxHeight = 80;

    // Make background semi-transparent black
    this.p.fill(0, 128);
    this.p.rect(boxX, boxY, boxWidth, boxHeight, 5);

    // Draw trail progress label and values at integer positions
    this.p.fill(255);
    this.p.text(`Trail Progress: ${trailProgress}%`, Math.floor(boxX + 10), Math.floor(boxY + 15));
    this.p.text(`Terrain: ${sectionName}`, Math.floor(boxX + 10), Math.floor(boxY + 35));

    // Draw weather indicator
    const weatherState = this.weatherSystem.getCurrentWeatherState();
    this.p.text(`Weather: ${WeatherState[weatherState]}`, Math.floor(boxX + 10), Math.floor(boxY + 55));

    // Draw progress bar background
    this.p.fill(100, 100, 100);
    this.p.rect(Math.floor(boxX + 10), Math.floor(boxY + 30), 180, 5);

    // Draw filled portion of progress bar
    // Color changes based on progress: green (start) to blue (middle) to purple (finish)
    const r = this.p.map(trailProgress, 0, 100, 50, 180);
    const g = this.p.map(trailProgress, 0, 50, 200, 100);
    const b = this.p.map(trailProgress, 0, 100, 50, 255);
    this.p.fill(r, g, b);
    this.p.rect(Math.floor(boxX + 10), Math.floor(boxY + 30), Math.floor(trailProgress * 1.8), 5);

    // Restore the previous transformation state
    // this.p.pop();
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

  // Show game over screen with menu
  private renderGameOverScreen(): void {
    // Semi-transparent dark overlay
    this.p.fill(0, 0, 0, 150);
    this.p.rect(0, 0, this.p.width, this.p.height);
    
    // Game over message depends on whether player crashed or completed the run
    const trailProgress = this.difficultyManager.getTrailProgress();
    const messageTitle = trailProgress >= 100 ? "RUN COMPLETED!" : "CRASHED!";
    
    // Create menu container
    const menuWidth = 300;
    const menuHeight = 200;
    const menuX = this.p.width / 2 - menuWidth / 2;
    const menuY = this.p.height / 2 - menuHeight / 2;
    
    // Draw menu background
    this.p.fill(50, 50, 50, 230);
    this.p.rect(menuX, menuY, menuWidth, menuHeight, 10);
    this.p.stroke(255);
    this.p.strokeWeight(2);
    this.p.noFill();
    this.p.rect(menuX + 5, menuY + 5, menuWidth - 10, menuHeight - 10, 8);
    this.p.noStroke();
    
    // Draw title
    this.p.fill(255);
    this.p.textSize(28);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text(messageTitle, this.p.width / 2, menuY + 50);
    
    // Draw stats
    this.p.textSize(16);
    this.p.text(`Distance: ${Math.floor(this.player.worldPos.y)} meters`, this.p.width / 2, menuY + 85);
    this.p.text(`Crashes: ${this.player.getCrashCount()}`, this.p.width / 2, menuY + 110);
    
    // Draw restart button
    const buttonWidth = 150;
    const buttonHeight = 40;
    const buttonX = this.p.width / 2 - buttonWidth / 2;
    const buttonY = menuY + menuHeight - 60;
    
    // Button background
    this.p.fill(70, 130, 180);
    this.p.rect(buttonX, buttonY, buttonWidth, buttonHeight, 5);
    
    // Button text
    this.p.fill(255);
    this.p.textSize(18);
    this.p.text("RESTART (R)", this.p.width / 2, buttonY + buttonHeight / 2);
  }

  // Get the current game state
  public getGameState(): GameState {
    return this.gameState;
  }

  // Reset game after game over
  public resetGame(): void {
    // Reset player position
    this.player = new Player(this.p, { x: 0, y: 0 }, this);

    // Create a new entity manager to clear all existing entities
    this.entityManager = new EntityManager(this.p, this);
    
    // Create a new difficulty manager
    this.difficultyManager = new DifficultyManager(this);

    // Reset game state
    this.gameState = GameState.PLAYING;
    this.isPaused = false;

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
  public loadSpriteAtlas(name: string, jsonPath: string, imagePath: string): Promise<SpriteAtlas> {
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

  /**
   * Renders a consolidated debug panel with all debug information
   */
  private renderDebugPanel(): void {
    const padding = 10;
    const lineHeight = 20;
    const panelWidth = 250;
    const panelHeight = 360; // Tall enough for all our debug info
    
    // Background panel with padding
    this.p.fill(0, 0, 0, 180);
    this.p.rect(padding, padding, panelWidth, panelHeight, 5);
    
    this.p.fill(255);
    this.p.textSize(12);
    this.p.textAlign(this.p.LEFT, this.p.TOP);
    
    // Game stats
    let y = padding + 10;
    this.p.text(`Obstacles: ${this.entityManager.getObstacleCount()}`, padding + 10, y); y += lineHeight;
    this.p.text(`AI Skiers: ${this.entityManager.getAISkierCount()}`, padding + 10, y); y += lineHeight;
    this.p.text(`Crash Count: ${this.player.getCrashCount()}`, padding + 10, y); y += lineHeight;
    
    // Player info
    this.p.text(`Player Speed: ${this.player.getCurrentSpeed().toFixed(2)}`, padding + 10, y); y += lineHeight;
    this.p.text(`Speed Offset: ${this.player.getSpeedOffset().toFixed(2)}`, padding + 10, y); y += lineHeight;
    this.p.text(`Base Speed: ${this.difficultyManager.getPlayerSpeed().toFixed(2)}`, padding + 10, y); y += lineHeight;
    this.p.text(`Position: (${this.player.worldPos.x.toFixed(0)}, ${this.player.worldPos.y.toFixed(0)})`, padding + 10, y); y += lineHeight;
    
    // Terrain info
    const playerPos = this.player.worldPos;
    const terrainHeight = this.world.getHeightAtPosition(playerPos);
    const slope = this.world.getSlopeAtPosition(playerPos);
    
    y += 10; // Add some spacing
    this.p.text(`Terrain height: ${terrainHeight.toFixed(3)}`, padding + 10, y); y += lineHeight;
    this.p.text(`Terrain slope: ${(slope.angle * 180 / Math.PI).toFixed(1)}°`, padding + 10, y); y += lineHeight;
    this.p.text(`Gradient: ${slope.gradient.toFixed(3)}`, padding + 10, y); y += lineHeight;
    this.p.text(`Height providers: ${this.world.getHeightProviderCount()}`, padding + 10, y); y += lineHeight;
    
    // Physics info
    y += 10; // Add some spacing
    this.p.text(`Grounded: ${this.player.isGrounded()}`, padding + 10, y); y += lineHeight;
    this.p.text(`Visual Height: ${this.player.getVisualHeight().toFixed(2)}`, padding + 10, y); y += lineHeight;
    this.p.text(`Ground Level: ${this.player.getGroundLevel().toFixed(2)}`, padding + 10, y); y += lineHeight;
    this.p.text(`Vertical Velocity: ${this.player.getVerticalVelocity().toFixed(2)}`, padding + 10, y); y += lineHeight;
    
    // Weather info
    y += 10; // Add some spacing
    this.p.text(`Weather: ${WeatherState[this.weatherSystem.getCurrentWeatherState()]}`, padding + 10, y); y += lineHeight;
    this.p.text(`Visibility: ${(100 - this.weatherSystem.getVisibilityFactor() * 100).toFixed(0)}%`, padding + 10, y);
  }
}

