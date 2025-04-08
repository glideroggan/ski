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
  private rotated: boolean;
  
  // New properties for trimmed sprites
  private trimmed: boolean;
  private srcOffsetX: number = 0;
  private srcOffsetY: number = 0;
  private origWidth: number;
  private origHeight: number;
  
  // Store the actual rendered height of the sprite
  spriteHeight: number = 0;
  
  constructor(
    p: p5,
    spriteSheet: p5.Image,
    srcX: number,
    srcY: number,
    srcWidth: number,
    srcHeight: number,
    flip: boolean = false,
    scale: number = 1.0,
    rotated: boolean = false,
    trimmed: boolean = false,
    srcOffsetX: number = 0,
    srcOffsetY: number = 0,
    origWidth: number = 0,
    origHeight: number = 0
  ) {
    this.p = p;
    this.spriteSheet = spriteSheet;
    this.srcX = srcX;
    this.srcY = srcY;
    this.srcWidth = srcWidth;
    this.srcHeight = srcHeight;
    this.flip = flip;
    this.scale = scale;
    this.rotated = rotated;
    this.trimmed = trimmed;
    this.srcOffsetX = srcOffsetX;
    this.srcOffsetY = srcOffsetY;
    this.origWidth = origWidth > 0 ? origWidth : srcWidth;
    this.origHeight = origHeight > 0 ? origHeight : srcHeight;

    // Initialize spriteHeight based on original height and scale
    if (!rotated) {
      this.spriteHeight = srcHeight * scale;
    } else {
      this.spriteHeight = srcWidth * scale;
    }
  }
  
  public render(x: number, y: number, width?: number, height?: number): void {
    // Save current transformation state
    this.p.push();
    
    // Move to the target position (center of the sprite)
    this.p.translate(x, y);
    
    // Apply horizontal flip if needed
    if (this.flip) {
      this.p.scale(-1, 1);
    }
    
    // Use provided dimensions or original dimensions
    const renderWidth = width ? width : this.origWidth;
    const renderHeight = height ? height : this.origHeight;
    
    // Apply scale
    const scaledWidth = renderWidth * this.scale;
    const scaledHeight = renderHeight * this.scale;
    
    if (!this.rotated) {
      // NON-ROTATED SPRITES
      
      // Calculate the dimensions of the sprite in the atlas
      const spriteWidth = this.srcWidth * (scaledWidth / this.origWidth);
      const spriteHeight = this.srcHeight * (scaledHeight / this.origHeight);


      
      // Calculate offset from center for trimmed sprites
      let offsetX = 0;
      let offsetY = 0;
      
      if (this.trimmed) {
        // Convert TexturePacker offsets (which are from top-left)
        // to our centered coordinate system
        offsetX = (this.srcOffsetX * 2 - (this.origWidth - this.srcWidth)) * (scaledWidth / this.origWidth) / 2;
        offsetY = (this.srcOffsetY * 2 - (this.origHeight - this.srcHeight)) * (scaledHeight / this.origHeight) / 2;
      }

      this.spriteHeight = spriteHeight
      
      // Draw the sprite (accounting for trim offsets)
      this.p.image(
        this.spriteSheet,
        -spriteWidth / 2 + offsetX,  // Centered X + offset
        -spriteHeight / 2 + offsetY, // Centered Y + offset
        spriteWidth,
        spriteHeight,
        this.srcX,
        this.srcY,
        this.srcWidth,
        this.srcHeight
      );
      
    } else {
      // ROTATED SPRITES (rotated 90° clockwise in the atlas)
      
      // For rotated sprites, we need to:
      // 1. Apply a counter-rotation
      // 2. Swap width/height for the sprite
      // 3. Adjust positioning for trimming
      this.p.rotate(-this.p.HALF_PI);
      
      // Calculate the dimensions of the sprite in the atlas (with width/height swapped)
      const spriteWidth = this.srcHeight * (scaledWidth / this.origWidth);
      const spriteHeight = this.srcWidth * (scaledHeight / this.origHeight);
      
      // Calculate offset from center for trimmed and rotated sprites
      let offsetX = 0;
      let offsetY = 0;
      
      if (this.trimmed) {
        // For rotated sprites, the offsets need special handling
        // X offset becomes Y offset and Y offset becomes X offset with sign changes
        offsetY = (this.srcOffsetX * 2 - (this.origWidth - this.srcHeight)) * (scaledWidth / this.origWidth) / 2;
        offsetX = -(this.srcOffsetY * 2 - (this.origHeight - this.srcWidth)) * (scaledHeight / this.origHeight) / 2;
      }
      
      this.spriteHeight = spriteHeight
      // Draw the sprite (accounting for rotation and trim offsets)
      this.p.image(
        this.spriteSheet,
        -spriteHeight / 2 + offsetX, // Note: width and height are swapped in rotated context
        -spriteWidth / 2 + offsetY,
        spriteHeight,
        spriteWidth,
        this.srcX,
        this.srcY,
        this.srcWidth,
        this.srcHeight
      );
    }
    
    // Debug visualization - draw bounding box at the original source size
    if (false) { // Set to false to disable debug visualization
      this.p.noFill();
      this.p.stroke(255, 0, 0);
      this.p.rect(-scaledWidth/2, -scaledHeight/2, scaledWidth, scaledHeight);
    }
    
    // Restore transformation state
    this.p.pop();
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

  public isRotated(): boolean {
    return this.rotated;
  }
  
  public isTrimmed(): boolean {
    return this.trimmed;
  }
  
  public getOrigWidth(): number {
    return this.origWidth;
  }
  
  public getOrigHeight(): number {
    return this.origHeight;
  }

  public getSrcOffsetX(): number {
    return this.srcOffsetX;
  }
  
  public getSrcOffsetY(): number {
    return this.srcOffsetY;
  }

  // Add a getter method for spriteHeight
  public getSpriteHeight(): number {
    return this.spriteHeight;
  }
}