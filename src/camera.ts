import p5 from "p5";
import { Game } from "./game";

export type Position = {
    x: number;
    y: number;
};

export class Camera {
    worldPos: Position = { x: 0, y: 0 };
    
    screenToWorld(screenPos: Position): Position {
        // Convert screen coordinates to world coordinates
        // taking camera position into account
        const worldX = screenPos.x + this.worldPos.x - this.p.width / 2;
        const worldY = screenPos.y + this.worldPos.y - this.p.height / 2;
        return { x: worldX, y: worldY };
    }
    
    worldToScreen(worldPos: Position): Position {
        // Convert world coordinates to screen coordinates
        // taking camera position into account
        const screenX = worldPos.x - this.worldPos.x + this.p.width / 2;
        const screenY = worldPos.y - this.worldPos.y + this.p.height / 2;
        return { x: screenX, y: screenY };
    }
    
    constructor(private p: p5, private game: Game) {
    }
    
    update() {
        // Make the camera follow the player
        if (this.game.player) {
            this.worldPos = { ...this.game.player.worldPos };
            // make the camera be a bit before the player
            this.worldPos.y += this.p.height / 4 - this.game.player.height / 2;
        }
    }
    
    // Handle viewport resize
    handleResize(newWidth: number, newHeight: number): void {
        // Update any camera-specific calculations that depend on screen dimensions
        // This is important for worldToScreen and screenToWorld conversions
        
        // If camera was centered on something before resize, you might need to
        // readjust its position to maintain the same world-to-screen relationship
        if (this.game.player) {
            // Recalculate camera position based on new dimensions
            this.update();
        }
    }
}