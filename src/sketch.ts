import p5 from 'p5';
import { Game } from './game';

// Create a new p5 instance
const sketch = (p: p5) => {
  let game: Game;

  p.setup = () => {
    // Create a canvas that fits precisely in the container
    const canvasWidth = 800;
    const canvasHeight = 600;
    
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
  };

  p.draw = () => {
    game.update();
    game.render();
  };

  p.keyPressed = () => {
    game.handleKeyPressed(p.keyCode);
    // return false; // Prevent default behavior
  };

  p.keyReleased = () => {
    game.handleKeyReleased(p.keyCode);
    // return false; // Prevent default behavior
  };

//   p.touchStarted = () => {
//     game.handleTouchStarted(p.touches);
//     return false; // Prevent default behavior
//   };

//   p.touchMoved = () => {
//     game.handleTouchMoved(p.touches);
//     return false; // Prevent default behavior
//   };

//   p.touchEnded = () => {
//     game.handleTouchEnded();
//     return false; // Prevent default behavior
//   };
};

// Start the sketch
new p5(sketch);