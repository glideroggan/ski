import p5 from "p5";
import { Game } from "./game";
import { Player } from "./player";
import { PlayerState } from "./player";

export class SkiTrack {
    points: { x: number, y: number, alpha: number }[] = [];
    maxPoints: number = 100;
    game: Game;
    private totalDistance: number = 0;

    constructor(game: Game) {
        this.game = game;
    }

    addPoint(worldX: number, worldY: number): void {
        if (!this.game.backgroundImage) return;
    
        console.log("Adding point:", { worldX, worldY });
        if (this.points.length > 0) {
            // Calculate distance moved since last point
            const lastPoint = this.points[this.points.length - 1];
            const dx = worldX - lastPoint.x;
            const dy = worldY - lastPoint.y;
            this.totalDistance += Math.sqrt(dx * dx + dy * dy);
            
            // Only add points if we've moved far enough (prevents adding duplicate points)
            if (this.totalDistance < 5) {
                return;
            }
            this.totalDistance = 0;
        }
        
        // Store the world position in the tracks array
        this.points.push({
            x: worldX,
            y: worldY,
            alpha: 255
        });
        
        if (this.game.debug) {
            console.log("Track point added:", { x: worldX, y: worldY });
        }
        
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
            
            // Only draw if points are reasonably close (prevents long lines)
            if (Math.sqrt(dx*dx + dy*dy) < 50) {
                // Convert world positions to screen positions using game's transformation
                const currentScreen = this.game.worldToScreen(point.x, point.y);
                const prevScreen = this.game.worldToScreen(prevPoint.x, prevPoint.y);
                
                // Draw two parallel lines for ski tracks
                p.stroke(255, 255, 255, point.alpha);
                
                // Left ski track
                p.line(prevScreen.x - 5, prevScreen.y, currentScreen.x - 5, currentScreen.y);
                // Right ski track
                p.line(prevScreen.x + 5, prevScreen.y, currentScreen.x + 5, currentScreen.y);
            }
            
            // Fade out tracks
            point.alpha = Math.max(0, point.alpha - 0.5);
        }

        if (this.game.debug) {
            p.fill(255, 255, 0);
            p.noStroke();
            p.textAlign(p.LEFT, p.TOP);
            p.text(`Track points: ${this.points.length}`, 10, 110);

            // Draw debug points
            p.noFill();
            p.stroke(255, 255, 0, 100);
            for (const point of this.points) {
                const screenPos = this.game.worldToScreen(point.x, point.y);
                p.ellipse(screenPos.x, screenPos.y, 5, 5);
            }
        }
    }
}