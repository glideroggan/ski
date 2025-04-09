import p5 from 'p5';

export class SnowParticle {
  private p: p5;
  public x: number = 0;
  public y: number = 0;
  private size: number = 0;
  private speedY: number = 0;
  private speedX: number = 0;
  private opacity: number = 0;
  private rotationAngle: number = 0;
  private rotationSpeed: number = 0;
  public active: boolean = false;
  private particleType: number; // 0-3 for different shapes
  
  constructor(p: p5) {
    this.p = p;
    this.reset();
    this.particleType = Math.floor(Math.random() * 4);
  }
  
  public reset(): void {
    // Initialize at a random position above the screen
    this.x = Math.random() * this.p.width;
    this.y = -50 - Math.random() * 100; // Start above the visible area
    
    // Random size and speed
    this.size = Math.random() * 8 + 2;
    this.speedY = this.size * 0.3 + Math.random() * 2;
    this.speedX = 0;
    
    // Random opacity
    this.opacity = 150 + Math.random() * 105;
    
    // Random rotation
    this.rotationAngle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.05;
  }
  
  public update(windDirection: number, windIntensity: number): void {
    if (!this.active) return;
    
    // Update position
    this.y += this.speedY;
    
    // Apply wind effects
    this.speedX = windDirection * windIntensity * (1 + Math.random() * 0.5);
    this.x += this.speedX;
    
    // Update rotation
    this.rotationAngle += this.rotationSpeed;
    
    // Reset if off-screen
    if (this.y > this.p.height + 50 || this.x < -50 || this.x > this.p.width + 50) {
      this.reset();
    }
  }
  
  public render(): void {
    this.p.push();
    this.p.translate(this.x, this.y);
    this.p.rotate(this.rotationAngle);
    this.p.noStroke();
    this.p.fill(255, this.opacity);
    
    // Draw different snowflake shapes based on particleType
    switch(this.particleType) {
      case 0: // Simple circle
        this.p.ellipse(0, 0, this.size, this.size);
        break;
      case 1: // Asterisk/snowflake shape
        this.p.push();
        for (let i = 0; i < 3; i++) {
          this.p.rotate(Math.PI / 3);
          this.p.rect(-this.size/2, -this.size/8, this.size, this.size/4);
        }
        this.p.pop();
        break;
      case 2: // Plus sign
        this.p.rect(-this.size/6, -this.size/2, this.size/3, this.size);
        this.p.rect(-this.size/2, -this.size/6, this.size, this.size/3);
        break;
      case 3: // Diamond
        this.p.quad(0, -this.size/2, this.size/2, 0, 0, this.size/2, -this.size/2, 0);
        break;
    }
    
    this.p.pop();
  }
}