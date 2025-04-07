import p5 from 'p5';
import { Sprite } from './sprite';

// TexturePacker JSON format used in your game
export interface TexturePackerFrame {
  filename: string;
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  sourceSize: {
    w: number;
    h: number;
  };
}

export interface TexturePackerAtlas {
  frames: TexturePackerFrame[];
  meta: {
    app: string;
    version: string;
    image: string;
    format: string;
    size: {
      w: number;
      h: number;
    };
    scale: string;
  };
}

export class SpriteAtlas {
  private p: p5;
  private atlasData: TexturePackerAtlas | null = null;
  private spriteSheet: p5.Image | null = null;
  private sprites: Map<string, Sprite> = new Map();
  private loaded: boolean = false;

  constructor(p: p5) {
    this.p = p;
  }

  public loadAtlas(jsonPath: string, imagePath?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load JSON atlas data
      fetch(jsonPath)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to load atlas: ${response.status} ${response.statusText}`);
          }
          return response.json();
        })
        .then((atlasData: TexturePackerAtlas) => {
          this.atlasData = atlasData;
          console.debug(`Atlas loaded: ${jsonPath}`);
          
          // Determine image path from meta data if not provided
          const actualImagePath = imagePath || atlasData.meta.image;
          console.debug(`Image path determined: ${actualImagePath}`);
          
          // Load the spritesheet image
          this.p.loadImage(
            actualImagePath,
            (img: p5.Image) => {
              this.spriteSheet = img;
              console.debug(`Spritesheet loaded: ${actualImagePath}, dimensions: ${img.width}x${img.height}`);
              this.processAtlas();
              this.loaded = true;
              resolve();
            },
            (err) => {
              console.error(`Failed to load spritesheet image: ${actualImagePath}`, err);
              reject(err);
            }
          );
        })
        .catch(err => {
          console.error(`Failed to load atlas JSON: ${jsonPath}`, err);
          reject(err);
        });
    });
  }

  private processAtlas(): void {
    if (!this.atlasData || !this.spriteSheet) {
      console.error("Cannot process atlas: data or spritesheet is missing");
      return;
    }

    try {
      // Process each frame in the atlas
      // TexturePacker format in your JSON has frames as an array
      if (Array.isArray(this.atlasData.frames)) {
        // Format: frames is an array of frame objects
        this.atlasData.frames.forEach((frame: TexturePackerFrame) => {
          this.processFrame(frame);
        });
      } else {
        // Format: frames is an object with filenames as keys
        for (const filename in (this.atlasData as any).frames) {
          const frame = {
            filename: filename,
            ...(this.atlasData as any).frames[filename]
          };
          this.processFrame(frame);
        }
      }
      
      console.debug(`Processed ${this.sprites.size} sprites from atlas`);
      
      // Log all sprite names for debugging
      console.debug("Available sprites:", Array.from(this.sprites.keys()));
    } catch (error) {
      console.error("Error processing atlas:", error);
    }
  }
  
  private processFrame(frame: TexturePackerFrame): void {
    const { x, y, w, h } = frame.frame;
    
    // Create a sprite for this frame
    const sprite = new Sprite(
      this.p,
      this.spriteSheet!,
      x, 
      y,
      w,
      h
    );
    
    // Store the sprite with its filename as the key
    this.sprites.set(frame.filename, sprite);
    
    // Also store without extension for convenience
    const nameWithoutExtension = frame.filename.replace(/\.[^/.]+$/, "");
    this.sprites.set(nameWithoutExtension, sprite);
    
    // Log for debugging
    console.debug(`Added sprite: ${frame.filename}, position: ${x},${y}, size: ${w}x${h}`);
  }

  public getSprite(name: string, flip: boolean = false, scale: number = 1.0): Sprite | null {
    // Try with the exact name first
    let sprite = this.sprites.get(name);
    
    // If not found and no extension provided, try with common extensions
    if (!sprite && !name.includes('.')) {
      sprite = this.sprites.get(`${name}.png`);
    }
    
    if (!sprite) {
      console.warn(`Sprite not found in atlas: ${name}`);
      return null;
    }
    
    // Create a new sprite with the flip and scale options
    return new Sprite(
      this.p,
      this.spriteSheet!,
      sprite.getSrcX(),
      sprite.getSrcY(),
      sprite.getSrcWidth(),
      sprite.getSrcHeight(),
      flip,
      scale
    );
  }

  public isLoaded(): boolean {
    return this.loaded;
  }

  public getFrameNames(): string[] {
    if (!this.atlasData) return [];
    
    // Handle different TexturePacker formats
    if (Array.isArray(this.atlasData.frames)) {
      return this.atlasData.frames.map((frame: TexturePackerFrame) => frame.filename);
    } else {
      return Object.keys(this.atlasData.frames);
    }
  }
}