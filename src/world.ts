import p5 from "p5";
import { Camera } from "./camera";
import { Game } from "./game";

// this will represent the world/mountain we are skiing on
// it should contain the stiched background image
// and the obstacles that are generated on it
export class World {
    
    constructor(private p: p5, private camera:Camera, private game: Game) {
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
                }
            }
        }
    }
}