import p5 from 'p5';
import { Game } from './game';

// Extend p5 type definition to include drawingContext
declare module 'p5' {
  interface p5InstanceExtensions {
    drawingContext: any;
  }
}

// Create a new p5 instance
const sketch = (p: p5) => {
  let game: Game;
  let canvasWidth: number;
  let canvasHeight: number;

  // Function to calculate canvas size based on window dimensions
  const calculateCanvasSize = () => {
    // Use window inner dimensions for responsive sizing
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    
    // Optional: set a maximum size or maintain aspect ratio if needed
    const maxWidth = 1920; // Example max width
    const maxHeight = 1080; // Example max height
    
    if (canvasWidth > maxWidth) canvasWidth = maxWidth;
    if (canvasHeight > maxHeight) canvasHeight = maxHeight;
    
    return { canvasWidth, canvasHeight };
  };

  // Handle window resize events
  const windowResized = () => {
    const { canvasWidth, canvasHeight } = calculateCanvasSize();
    
    // Resize the canvas
    p.resizeCanvas(canvasWidth, canvasHeight);
    
    // Update the container size
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.style.width = canvasWidth + "px";
      gameContainer.style.height = canvasHeight + "px";
    }
    
    // Notify game of resize if needed
    if (game) {
      game.handleResize(canvasWidth, canvasHeight);
    }
  };

  p.setup = () => {
    // Calculate initial canvas dimensions
    const { canvasWidth, canvasHeight } = calculateCanvasSize();

    class CustomRenderer extends (p5.Renderer as any) {      constructor(elt: HTMLElement, pInst: p5, isMainCanvas: boolean) {
        super(elt, pInst, isMainCanvas);
        this.drawingContext = this.canvas.getContext("2d", {
          willReadFrequently: true,
          alpha: true,
          antialias: false,  // Disable antialiasing for sharper text
        });
        
        // Configure text rendering for crisp edges
        this.drawingContext.textRendering = 'geometricPrecision';
        this.drawingContext.imageSmoothingEnabled = false;
        
        this._pInst._setProperty("drawingContext", this.drawingContext);
      }
    }

    (p5 as any).Renderer = CustomRenderer;
    
    // Get the canvas container
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.style.width = canvasWidth + "px";
      gameContainer.style.height = canvasHeight + "px";
    }
    
    const canvas = p.createCanvas(canvasWidth, canvasHeight);
    canvas.parent('game-container');
    
    // Set framerate to 60 FPS
    p.frameRate(60);
    
    // Initialize game
    game = new Game(p);
    
    // Load all sprite atlases
    game.loadAllAtlases().catch(err => {
      console.error('Failed to load sprite atlases:', err);
    });
  };

  p.draw = () => {
    game.update();
    game.render();
  };

  // Keyboard input is now handled by GameControls class
  
  p.windowResized = windowResized;

  // Touch input can be implemented when needed
  // p.touchStarted = () => { ... };
  // p.touchMoved = () => { ... };
  // p.touchEnded = () => { ... };
};

// Start the sketch
new p5(sketch);