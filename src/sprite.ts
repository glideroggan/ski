import p5 from 'p5';

export class Sprite {
  private p: p5;
  private spriteSheet: p5.Image;
  private srcX: number;
  private srcY: number;
  private srcWidth: number;
  private srcHeight: number;
  private flip: boolean;
  private scale: number;
  
  constructor(
    p: p5,
    spriteSheet: p5.Image,
    srcX: number,
    srcY: number,
    srcWidth: number,
    srcHeight: number,
    flip: boolean = false,
    scale: number = 1.0
  ) {
    this.p = p;
    this.spriteSheet = spriteSheet;
    this.srcX = srcX;
    this.srcY = srcY;
    this.srcWidth = srcWidth;
    this.srcHeight = srcHeight;
    this.flip = flip;
    this.scale = scale;
  }
  
  public render(x: number, y: number, width?: number, height?: number): void {
    // Apply scale factor to width and height if provided
    const w = width ? width * this.scale : this.srcWidth * this.scale;
    const h = height ? height * this.scale : this.srcHeight * this.scale;
    
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
  
  public setScale(scale: number): void {
    this.scale = scale;
  }
  
  public getScale(): number {
    return this.scale;
  }

  // Getter methods for SpriteAtlas to use
  public getSrcX(): number {
    return this.srcX;
  }

  public getSrcY(): number {
    return this.srcY;
  }

  public getSrcWidth(): number {
    return this.srcWidth;
  }

  public getSrcHeight(): number {
    return this.srcHeight;
  }
}