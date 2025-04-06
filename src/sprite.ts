import p5 from 'p5';

export class Sprite {
  private p: p5;
  private spriteSheet: p5.Image;
  private srcX: number;
  private srcY: number;
  private srcWidth: number;
  private srcHeight: number;
  private flip: boolean;
  
  constructor(
    p: p5,
    spriteSheet: p5.Image,
    srcX: number,
    srcY: number,
    srcWidth: number,
    srcHeight: number,
    flip: boolean = false
  ) {
    this.p = p;
    this.spriteSheet = spriteSheet;
    this.srcX = srcX;
    this.srcY = srcY;
    this.srcWidth = srcWidth;
    this.srcHeight = srcHeight;
    this.flip = flip;
  }
  
  public render(x: number, y: number, width?: number, height?: number): void {
    const w = width || this.srcWidth;
    const h = height || this.srcHeight;
    
    // Save the current transformation state
    this.p.push();

    if (this.flip) {
      // Translate to the center position
      this.p.translate(x, y);
      // Flip horizontally by scaling negative on x-axis
      this.p.scale(-1, 1);
      // Translate back to correctly position the image
      this.p.translate(-x, -y);
    }

    // After drawing, we'll restore the transformation state with this.p.pop()
    // Draw the specific part of the spritesheet
    this.p.image(
      this.spriteSheet,
      x - w / 2,  // Center the sprite at (x, y)
      y - h / 2,
      w,
      h,
      this.srcX,
      this.srcY,
      this.srcWidth,
      this.srcHeight
    );
    this.p.pop(); // Restore the transformation state
  }
}