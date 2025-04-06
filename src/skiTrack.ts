import p5 from "p5";
import { Game } from "./game";
import { Player } from "./player";
import { PlayerState } from "./player";

export class SkiTrack {
    points: { x: number, y: number, alpha: number }[] = [];
    maxPoints: number = 100;
    game: Game;
    private lastAddedDistance: number = 0;
    private minSpacing: number = 15; // Minimum distance between track points

    constructor(game: Game) {
        this.game = game;
    }

    addPoint(worldX: number, worldY: number): void {
        if (!this.game.backgroundImage) return;
        
        if (this.points.length > 0) {
            // Calculate distance from last point to avoid too many points
            const lastPoint = this.points[this.points.length - 1];
            const dx = worldX - lastPoint.x;
            const dy = worldY - lastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Only add points if we've moved far enough
            if (distance < this.minSpacing) {
                return;
            }
        }
        
        // Store the world position of the ski track point
        this.points.push({
            x: worldX,
            y: worldY,
            alpha: 200 // Start with slightly lower alpha for more natural look
        });
        
        // Remove oldest points if we exceed the maximum
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }

    render(p: p5): void {
        if (this.points.length < 2 || !this.game.backgroundImage) return;
        
        p.noFill();
        p.strokeWeight(2);

        for (let i = 1; i < this.points.length; i++) {
            const point = this.points[i];
            const prevPoint = this.points[i - 1];
            
            // Calculate distance between points
            const dx = point.x - prevPoint.x;
            const dy = point.y - prevPoint.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            // Only draw if points are reasonably close (prevents long lines)
            if (distance < 50) {
                // Convert world coordinates to screen coordinates
                const screenPos = this.game.camera.worldToScreen(point);
                const prevScreenPos = this.game.camera.worldToScreen(prevPoint);
                
                // Calculate proper angle for parallel ski tracks
                const angle = Math.atan2(dy, dx);
                const perpX = Math.cos(angle + Math.PI/2) * 5;
                const perpY = Math.sin(angle + Math.PI/2) * 5;
                
                // Draw two parallel lines for the ski tracks with proper alpha
                p.stroke(255, 255, 255, point.alpha);
                
                // Left ski track
                p.line(
                    prevScreenPos.x - perpX, 
                    prevScreenPos.y - perpY, 
                    screenPos.x - perpX, 
                    screenPos.y - perpY
                );
                
                // Right ski track
                p.line(
                    prevScreenPos.x + perpX, 
                    prevScreenPos.y + perpY, 
                    screenPos.x + perpX, 
                    screenPos.y + perpY
                );
            }
            
            // Fade out tracks over time (faster fade to avoid too many visible tracks)
            point.alpha = Math.max(0, point.alpha - 1.5);
        }

        // Clean up points with zero alpha to save memory
        this.points = this.points.filter(point => point.alpha > 0);
        
        if (this.game.debug) {
            p.fill(255, 255, 0);
            p.noStroke();
            p.textAlign(p.LEFT, p.TOP);
            p.text(`Track points: ${this.points.length}`, 10, 110);

            // Draw debug points at each ski track point
            p.noFill();
            p.stroke(255, 255, 0, 100);
            for (const point of this.points) {
                const screenPos = this.game.camera.worldToScreen(point);
                p.ellipse(screenPos.x, screenPos.y, 5, 5);
            }
        }
    }
}