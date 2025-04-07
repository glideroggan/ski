import p5 from "p5";
import { Camera } from "./camera";
import { Game } from "./game";
import { Position } from "./camera";

// this will represent the world/mountain we are skiing on
// it should contain the stiched background image
// and the obstacles that are generated on it
export class World {
    private heightmap: p5.Image | null = null;
    private heightmapLoaded: boolean = false;
    private debugHeightmap: boolean = false;
    
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
     * Returns a value between 0 and 1, where 0 is lowest and 1 is highest point
     */
    public getHeightAtPosition(worldPos: Position): number {
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

        // Debug: visualize terrain height at player position
        if (this.game.debug && this.heightmapLoaded && this.game.player) {
            const playerPos = this.game.player.worldPos;
            const height = this.getHeightAtPosition(playerPos);
            const slope = this.getSlopeAtPosition(playerPos);
            
            this.p.fill(255);
            this.p.noStroke();
            this.p.textAlign(this.p.LEFT, this.p.TOP);
            this.p.text(`Terrain height: ${height.toFixed(3)}`, 10, 130);
            this.p.text(`Terrain slope: ${(slope.angle * 180 / Math.PI).toFixed(1)}°`, 10, 150);
            this.p.text(`Gradient: ${slope.gradient.toFixed(3)}`, 10, 170);
            this.p.text(`Smoothing: ${this.smoothingFactor.toFixed(2)}`, 10, 190);
        }
    }

    public toggleDebugHeightmap(): void {
        this.debugHeightmap = !this.debugHeightmap;
    }
    
    // Adjust smoothing factor (can be called from game.ts)
    public setHeightSmoothingFactor(factor: number): void {
        this.smoothingFactor = Math.max(0, Math.min(1, factor));
    }
}