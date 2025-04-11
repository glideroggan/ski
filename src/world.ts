import p5 from "p5";
import { Camera } from "./camera";
import { Game } from "./game";
import { Position } from "./camera";

// this will represent the world/mountain we are skiing on
// it should contain the stiched background image
// and the obstacles that are generated on it

// Interface for objects that can affect the terrain height
export interface IHeightProvider {
    // Check if this provider affects a specific world position
    affectsPosition(worldPos: Position): boolean;
    
    // Get the height contribution at a specific world position (0-1 range)
    getHeightAt(worldPos: Position): number;
}

// Snowdrift-specific heightmap implementation
export class SnowdriftHeightmap implements IHeightProvider {
    constructor(
        private position: Position,
        private width: number,
        private height: number,
        private maxHeight: number = 3
    ) {}
    
    affectsPosition(worldPos: Position): boolean {
        // Check if the position is within the snowdrift bounds
        const dx = Math.abs(worldPos.x - this.position.x);
        const dy = Math.abs(worldPos.y - this.position.y);
        const withinBounds = dx <= this.width/2 && dy <= this.height/2;
        
        return withinBounds;
    }
    
    getHeightAt(worldPos: Position): number {
        // If not affecting this position, return 0
        if (!this.affectsPosition(worldPos)) {
            return 0;
        }
        
        // Calculate relative position within the snowdrift
        const dx = (worldPos.x - this.position.x) / (this.width/2);
        const dy = (worldPos.y - this.position.y) / (this.height/2);
        
        // Create an extremely asymmetric curve - gradual upslope, very sharp downslope
        // First, determine if we're on the uphill or downhill side
        const isDownhill = dy > 0; // Positive Y is downhill
        
        // Use different curve shapes for uphill vs downhill sides
        let heightFactor;
        
        if (isDownhill) {
            // Downhill side (back of snowdrift): Extremely steep drop-off
            // Create a cliff-like drop using a modified curve
            const steepnessFactor = 4.5; // Dramatically increased for cliff-like drop
            const adjustedDy = dy * steepnessFactor;
            const distanceSquared = dx*dx + adjustedDy*adjustedDy;
            
            // Use a much sharper exponential factor for downhill
            heightFactor = Math.exp(-distanceSquared * 5.0);
            
            // Extra debug for downhill side
            if (Math.abs(dx) < 0.1 && dy > 0.1 && dy < 0.5) {
                console.debug(`Downhill height: ${(heightFactor * this.maxHeight).toFixed(3)} at dy=${dy.toFixed(2)}`);
            }
        } else {
            // Uphill side (front of snowdrift): More gradual slope
            // Use a gentler curve for uphill
            const distanceSquared = dx*dx + dy*dy;
            heightFactor = Math.exp(-distanceSquared * 1.5); // Reduced from 2.0 for more gradual uphill
            
            // Extra debug for uphill center
            if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) {
                console.debug(`Uphill center height: ${(heightFactor * this.maxHeight).toFixed(3)}`);
            }
        }
        
        // Scale by the maximum height
        const height = heightFactor * this.maxHeight;
        
        return height;
    }
}

export class World {
    private heightmap: p5.Image | null = null;
    private heightmapLoaded: boolean = false;
    private debugHeightmap: boolean = false;
    
    // Collection of additional height providers (like snowdrifts)
    private heightProviders: IHeightProvider[] = [];
    
    // Heightmap sampling properties - simplified from previous version
    private smoothingFactor: number = 0.15; // Controls smoothing between height samples (0-1)
    
    constructor(private p: p5, private camera:Camera, private game: Game) {
        this.loadHeightmap();
    }

    private loadHeightmap(): void {
        // NOTE: assets are found in assets!
        this.p.loadImage('assets/snow_true_heightmap.png',
            (img: p5.Image) => {
                this.heightmap = img;
                this.heightmapLoaded = true;
                console.debug("Heightmap loaded. Dimensions:", img.width, "x", img.height);
            },
            (err) => {
                console.error('Failed to load heightmap:', err);
            }
        );
    }

    /**
     * Sample the heightmap to get the terrain height at a specific world position
     * Returns the total height value, with 0 as lowest (no longer clamped to 1.0 max)
     */
    public getHeightAtPosition(worldPos: Position): number {
        let height = this.getTerrainHeightAtPosition(worldPos);
        
        // Apply additional height providers
        for (const provider of this.heightProviders) {
            if (provider.affectsPosition(worldPos)) {
                height += provider.getHeightAt(worldPos);
            }
        }
        
        // Only clamp lower bound, allow heights greater than 1.0
        return Math.max(0, height);
    }

    /**
     * Get the terrain slope at a position by sampling neighboring heights
     * Returns an angle in radians
     */
    public getSlopeAtPosition(worldPos: Position): { angle: number, gradient: number } {
        if (!this.heightmapLoaded || !this.heightmap) {
            return { angle: 0, gradient: 0 }; // Default if heightmap isn't loaded
        }
        
        // Sample heights at neighboring points to calculate gradient
        const sampleDistance = 5; // Distance between sample points
        const centerHeight = this.getHeightAtPosition(worldPos);
        const rightHeight = this.getHeightAtPosition({ 
            x: worldPos.x + sampleDistance, 
            y: worldPos.y 
        });
        const downHeight = this.getHeightAtPosition({ 
            x: worldPos.x, 
            y: worldPos.y + sampleDistance 
        });
        
        // Calculate x and y gradients
        const xGradient = (rightHeight - centerHeight) / sampleDistance;
        const yGradient = (downHeight - centerHeight) / sampleDistance;
        
        // Calculate combined gradient and angle
        const gradient = Math.sqrt(xGradient * xGradient + yGradient * yGradient);
        const angle = Math.atan2(yGradient, xGradient);
        
        return { angle, gradient };
    }

    update() {
        // Any world-related updates would go here
    }

    render() {
        // render the background image correctly, tiling it in relation to the camera position
        if (this.game.backgroundImage) {
            const cameraPos = this.camera.worldPos;
            const imageWidth = this.game.backgroundImage.width;
            const imageHeight = this.game.backgroundImage.height;
            
            // Calculate the number of tiles needed to cover the screen
            const numTilesX = Math.ceil(this.p.width / imageWidth) + 1;
            const numTilesY = Math.ceil(this.p.height / imageHeight) + 1;
            
            // Calculate starting positions based on camera position
            const startX = Math.floor(cameraPos.x / imageWidth) * imageWidth - (this.p.width / 2);
            const startY = Math.floor(cameraPos.y / imageHeight) * imageHeight - (this.p.height / 2);
            
            for (let x = 0; x < numTilesX; x++) {
                for (let y = 0; y < numTilesY; y++) {
                    const worldX = startX + (x * imageWidth);
                    const worldY = startY + (y * imageHeight);
                    
                    // Convert world coordinates to screen coordinates
                    const screenPos = this.camera.worldToScreen({ x: worldX, y: worldY });
                    
                    // plus 1 to avoid the seams between images
                    this.p.image(this.game.backgroundImage, screenPos.x, screenPos.y, imageWidth+1, imageHeight+1);
                    
                    // Debug: show heightmap if debug mode is enabled
                    if (this.debugHeightmap && this.heightmap) {
                        this.p.tint(255, 100); // Semi-transparent overlay
                        this.p.image(this.heightmap, screenPos.x, screenPos.y, imageWidth+1, imageHeight+1);
                        this.p.noTint();
                    }
                }
            }
        }
    }

    public toggleDebugHeightmap(): void {
        this.debugHeightmap = !this.debugHeightmap;
    }
    
    // Adjust smoothing factor (can be called from game.ts)
    public setHeightSmoothingFactor(factor: number): void {
        this.smoothingFactor = Math.max(0, Math.min(1, factor));
    }

    /**
     * Add a height provider to the world (like a snowdrift)
     */
    public addHeightProvider(provider: IHeightProvider): void {
        console.debug("Adding height provider:", provider);
        this.heightProviders.push(provider);
    }
    
    /**
     * Remove a height provider from the world
     */
    public removeHeightProvider(provider: IHeightProvider): void {
        const index = this.heightProviders.indexOf(provider);
        if (index !== -1) {
            this.heightProviders.splice(index, 1);
        }
    }
    
    /**
     * Get the number of active height providers
     */
    public getHeightProviderCount(): number {
        return this.heightProviders.length;
    }
    
    /**
     * Get the base terrain height from the heightmap image
     */
    private getTerrainHeightAtPosition(worldPos: Position): number {
        if (!this.heightmapLoaded || !this.heightmap || !this.game.backgroundImage) {
            return 0; // Default height if heightmap isn't loaded
        }

        // Calculate relative position within the heightmap image
        const imgWidth = this.game.backgroundImage.width;
        const imgHeight = this.game.backgroundImage.height;
        
        // Get modulo position within a single tile
        const tileX = ((worldPos.x % imgWidth) + imgWidth) % imgWidth;
        const tileY = ((worldPos.y % imgHeight) + imgHeight) % imgHeight;
        
        // Convert to pixel coordinates in the heightmap
        const pixelX = Math.floor((tileX / imgWidth) * this.heightmap.width);
        const pixelY = Math.floor((tileY / imgHeight) * this.heightmap.height);
        
        // Sample the heightmap - gets the brightness of the pixel (0-255)
        const color = this.heightmap.get(pixelX, pixelY);
        
        // Convert to a height value between 0 and 1
        // Grayscale heightmap: darker areas are higher, whiter areas are lower
        // We invert the brightness to get the proper height
        const brightness = this.p.brightness(color) / 255;
        return 1.0 - brightness; // Invert so darker = higher
    }
}