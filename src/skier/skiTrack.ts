import p5 from 'p5';
import { Position } from '../camera';

/**
 * Represents the ski tracks left behind by a skier
 */
export class SkiTrack {
    private points: { x: number, y: number, alpha: number }[] = [];
    private maxPoints: number = 100; // Maximum number of track points to store
    private minSpacing: number = 15; // Minimum distance between track points
    private p: p5;
    private trackWidth: number = 5; // Distance between the two ski lines
    private fadeRate: number = 0.8; // How quickly tracks fade out

    constructor(p: p5) {
        this.p = p;
    }

    /**
     * Add a new track point
     */
    public addPoint(worldX: number, worldY: number): void {
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

    /**
     * Render the ski tracks
     */
    public render(p: p5, worldToScreen: (pos: Position) => Position): void {
        if (this.points.length < 2) return;
        
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
                const screenPos = worldToScreen(point);
                const prevScreenPos = worldToScreen(prevPoint);
                
                // Calculate proper angle for parallel ski tracks
                const angle = Math.atan2(dy, dx);
                const perpX = Math.cos(angle + Math.PI/2) * this.trackWidth;
                const perpY = Math.sin(angle + Math.PI/2) * this.trackWidth;
                
                // Draw tracks with the current alpha value
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
            
            // Fade out tracks over time
            point.alpha = Math.max(0, point.alpha - this.fadeRate);
        }

        // Clean up points with zero alpha to save memory
        this.points = this.points.filter(point => point.alpha > 0);
    }
    
    /**
     * Get the number of track points
     */
    public getPointCount(): number {
        return this.points.length;
    }
}