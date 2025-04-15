import p5 from 'p5';
import { Game, RenderableObject } from './game';
import { CollisionHitbox, ICollidable } from './collision/ICollidable';
import { Position } from './camera';
import { Sprite } from './sprite';

// Define gate colors and difficulty levels
export type SlalomGateColor = 'red' | 'blue';
export type SlalomGateDifficulty = 'easy' | 'medium' | 'hard';

// Define a type for slalom gate to be recognized in collision system
// Need to extend the EntityType in skier.entity.ts
export type SlalomGateType = 'slalomGate';

/**
 * SlalomGate represents a skiing slalom gate that players must pass through
 * It consists of two poles with a banner between them
 */
export class SlalomGate implements RenderableObject, ICollidable {
    public worldPos: Position;
    public width: number;
    public height: number;
    // This will be modified in skier.entity.ts to include 'slalomGate'
    public type: 'slalomGate' = 'slalomGate';

    // Visual components
    private gateSprite: Sprite | null;  // Single sprite for the entire gate
    private gateColor: SlalomGateColor;
    private difficulty: SlalomGateDifficulty;

    // Game state
    private passed: boolean = false;
    private missed: boolean = false;
    private passedTimestamp: number = 0;
    private visualFeedbackDuration: number = 60; // 1 second at 60fps

    // Constants for different difficulty levels
    private static readonly GATE_WIDTHS = {
        'easy': 230,    // Wide gates
        'medium': 150,  // Medium gates
        'hard': 100     // Narrow gates
    };

    // Pole dimensions
    private poleWidth: number = 20;
    private poleHeight: number = 250;

    // Debug mode
    private debug: boolean = false;

    constructor(
        position: Position,
        color: SlalomGateColor,
        difficulty: SlalomGateDifficulty,
        gateSprite: Sprite | null
    ) {
        this.worldPos = position;
        this.gateColor = color;
        this.difficulty = difficulty;
        this.gateSprite = gateSprite;

        // Set the base width based on difficulty
        let baseWidth = SlalomGate.GATE_WIDTHS[difficulty];

        // Check if sprite is rotated and adjust dimensions accordingly
        this.width = baseWidth;
        this.height = this.poleHeight;
    }

    /**
     * Renders the slalom gate
     */
    public render(p: p5, game: Game): void {
        // Convert world position to screen position
        const screenPos = game.camera.worldToScreen(this.worldPos);
        
        p.push();
        
        // Apply tint based on gate color and state
        if (this.gateSprite) {
            if (this.gateColor === 'red') {
                p.tint(255, 100, 100); // Red tint
            } else {
                p.tint(100, 100, 255); // Blue tint
            }
            
            // Apply different tint if passed or missed (for visual feedback)
            if (this.passed && p.frameCount - this.passedTimestamp < this.visualFeedbackDuration) {
                p.tint(100, 255, 100); // Green for success
            } else if (this.missed && p.frameCount - this.passedTimestamp < this.visualFeedbackDuration) {
                p.tint(255, 100, 100); // Red for missed
            }
            
            // For rotated sprites, rotation is already handled by the Sprite class
            this.gateSprite.render(screenPos.x, screenPos.y, this.width, this.height);
        } else {
            // Fallback rendering if sprite is missing
            const leftPolePos = {
                x: screenPos.x - this.width / 2,
                y: screenPos.y
            };

            const rightPolePos = {
                x: screenPos.x + this.width / 2,
                y: screenPos.y
            };

            // Set colors based on gate color
            const bannerColor = this.gateColor === 'red' ? p.color(220, 50, 50, 200) : p.color(50, 50, 220, 200);
            p.fill(bannerColor);

            // If gate has been passed, change the banner color
            if (this.passed && p.frameCount - this.passedTimestamp < this.visualFeedbackDuration) {
                p.fill(50, 220, 50, 200); // Green for success
            } else if (this.missed && p.frameCount - this.passedTimestamp < this.visualFeedbackDuration) {
                p.fill(220, 50, 50, 200); // Red for missed
            }

            // Draw banner
            p.rect(leftPolePos.x, leftPolePos.y - this.poleHeight / 2, this.width, 20);

            p.fill(this.gateColor === 'red' ? p.color(200, 0, 0) : p.color(0, 0, 200));

            // Left pole
            p.rect(leftPolePos.x - this.poleWidth / 2, leftPolePos.y - this.poleHeight / 2,
                this.poleWidth, this.poleHeight);

            // Right pole
            p.rect(rightPolePos.x - this.poleWidth / 2, rightPolePos.y - this.poleHeight / 2,
                this.poleWidth, this.poleHeight);
        }

        // Draw text label in debug mode
        if (game.debug || this.debug) {
            p.noTint(); // Reset tint before drawing text
            p.fill(255);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(14);
            p.text(`${this.gateColor} ${this.difficulty} gate`, screenPos.x, screenPos.y - this.poleHeight);

            if (this.passed) {
                p.text('PASSED', screenPos.x, screenPos.y - this.poleHeight - 20);
            } else if (this.missed) {
                p.text('MISSED', screenPos.x, screenPos.y - this.poleHeight - 20);
            }
        }

        p.pop();

        // Debug rendering
        if (game.debug || this.debug) {
            this.renderDebugInfo(p, game);
        }
    }

    /**
     * Render debug visualization
     */
    private renderDebugInfo(p: p5, game: Game): void {
        // Draw the gate area (space between poles)
        const screenPos = game.camera.worldToScreen(this.worldPos);

        p.push();
        p.noFill();
        
        // Gate detection zone - dashed green rectangle showing the passing area
        // This is rectangle #1 that you see in debug mode
        p.stroke(0, 255, 0, 180); // Semi-transparent green
        p.strokeWeight(2);
        
        // Draw dashed lines to indicate this is a detection zone, not a collision box
        p.drawingContext.setLineDash([5, 5]); // Create dashed line pattern
        p.rect(screenPos.x - this.width / 2, screenPos.y - this.height / 2, this.width, this.height);
        p.drawingContext.setLineDash([]); // Reset to solid line
        
        // Add "Detection Zone" text to make it super clear
        p.fill(0, 255, 0, 180);
        p.noStroke();
        p.textAlign(p.CENTER, p.TOP);
        p.textSize(10);
        p.text("Detection Zone", screenPos.x, screenPos.y - this.height / 2 - 15);

        // Draw the collision hitboxes for the poles
        const leftPoleHitbox = this.getLeftPoleHitbox();
        const rightPoleHitbox = this.getRightPoleHitbox();

        const leftPoleScreenPos = game.camera.worldToScreen(leftPoleHitbox.position);
        const rightPoleScreenPos = game.camera.worldToScreen(rightPoleHitbox.position);

        // These red rectangles are the actual collision areas
        p.noFill();
        p.stroke(255, 0, 0);
        p.strokeWeight(2);

        // Left pole hitbox - red rectangle #2 that you see in debug mode
        // Player must avoid colliding with this to pass through successfully
        p.rect(
            leftPoleScreenPos.x - leftPoleHitbox.width / 2,
            leftPoleScreenPos.y - leftPoleHitbox.height / 2,
            leftPoleHitbox.width,
            leftPoleHitbox.height
        );

        // Right pole hitbox - red rectangle #3 that you see in debug mode
        // Player must avoid colliding with this to pass through successfully
        p.rect(
            rightPoleScreenPos.x - rightPoleHitbox.width / 2,
            rightPoleScreenPos.y - rightPoleHitbox.height / 2,
            rightPoleHitbox.width,
            rightPoleHitbox.height
        );

        p.pop();
    }

    /**
     * Update method called each frame
     */
    public update(): void {
        // Gates are static in the world for now, but we could add animations here
    }

    /**
     * Get collision hitbox for the entire gate (used for triggering gate pass detection)
     */
    public getCollisionHitbox(): CollisionHitbox {
        return {
            position: this.worldPos,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Get collision hitbox for left pole only
     */
    public getLeftPoleHitbox(): CollisionHitbox {
        return {
            position: {
                x: this.worldPos.x - this.width / 2,
                y: this.worldPos.y
            },
            width: this.poleWidth,
            height: this.poleHeight
        };
    }

    /**
     * Get collision hitbox for right pole only
     */
    public getRightPoleHitbox(): CollisionHitbox {
        return {
            position: {
                x: this.worldPos.x + this.width / 2,
                y: this.worldPos.y
            },
            width: this.poleWidth,
            height: this.poleHeight
        };
    }

    /**
     * Handle collision with another entity
     * For gates, we're mostly concerned with the player passing through
     */
    public handleCollision(other: ICollidable): void {
        // If already passed or missed, do nothing
        if (this.passed || this.missed) return;

        // Only process collisions with player
        if (other.type !== 'player') return;

        // Check if player has collided with the entire gate area (between poles)
        // and check collisions with the poles themselves
        const leftPoleHitbox = this.getLeftPoleHitbox();
        const rightPoleHitbox = this.getRightPoleHitbox();

        const collidesWithLeftPole = this.checkHitboxCollision(other.getCollisionHitbox(), leftPoleHitbox);
        const collidesWithRightPole = this.checkHitboxCollision(other.getCollisionHitbox(), rightPoleHitbox);
        
        if (collidesWithLeftPole || collidesWithRightPole) {
            // Player hit a pole - gate missed
            this.markAsMissed();
            console.debug(`Player hit a ${this.gateColor} gate pole`);
            
            // Only apply collision effect if player actually hit a pole
            // Cast to any first to access the method without TypeScript errors
            const player = other as any;
            if (typeof player.handleGateCollision === 'function') {
                player.handleGateCollision(true); // true = hit pole
            }
        } else {
            // Player is between poles and didn't hit either pole - gate passed
            this.markAsPassed();
            console.debug(`Player passed through ${this.gateColor} ${this.difficulty} gate`);
            
            // For passes, call handleGateCollision with false to indicate no collision effect
            const player = other as any;
            if (typeof player.handleGateCollision === 'function') {
                player.handleGateCollision(false); // false = passed gate, no hit
            }
        }
    }

    /**
     * Check if two hitboxes are colliding
     */
    private checkHitboxCollision(hitbox1: CollisionHitbox, hitbox2: CollisionHitbox): boolean {
        return (
            hitbox1.position.x - hitbox1.width / 2 < hitbox2.position.x + hitbox2.width / 2 &&
            hitbox1.position.x + hitbox1.width / 2 > hitbox2.position.x - hitbox2.width / 2 &&
            hitbox1.position.y - hitbox1.height / 2 < hitbox2.position.y + hitbox2.height / 2 &&
            hitbox1.position.y + hitbox1.height / 2 > hitbox2.position.y - hitbox2.height / 2
        );
    }

    /**
     * Mark the gate as successfully passed
     */
    public markAsPassed(): void {
        if (!this.passed && !this.missed) {
            this.passed = true;
            this.passedTimestamp = window.performance ? Math.floor(performance.now()) : 0;
        }
    }

    /**
     * Mark the gate as missed
     */
    public markAsMissed(): void {
        if (!this.passed && !this.missed) {
            this.missed = true;
            this.passedTimestamp = window.performance ? Math.floor(performance.now()) : 0;
        }
    }

    /**
     * Check if gate has been passed
     */
    public isPassed(): boolean {
        return this.passed;
    }

    /**
     * Check if gate has been missed
     */
    public isMissed(): boolean {
        return this.missed;
    }

    /**
     * Toggle debug mode
     */
    public toggleDebug(): void {
        this.debug = !this.debug;
    }

    /**
     * Get gate color
     */
    public getColor(): SlalomGateColor {
        return this.gateColor;
    }

    /**
     * Get gate difficulty
     */
    public getDifficulty(): SlalomGateDifficulty {
        return this.difficulty;
    }
}