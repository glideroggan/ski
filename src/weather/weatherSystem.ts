import p5 from 'p5';
import { Game } from '../game';
import { SnowParticle } from './snowParticle';

export enum WeatherState {
  CLEAR,
  LIGHT_SNOW,
  HEAVY_SNOW,
  BLIZZARD
}

export class WeatherSystem {
  private p: p5;
  private game: Game;
  private currentState: WeatherState = WeatherState.CLEAR;
  private targetState: WeatherState = WeatherState.CLEAR;
  private transitionProgress: number = 0;
  private transitionSpeed: number = 0.005; // How quickly weather changes
  private suddenTransition: boolean = false;
  
  // Weather effects
  private particles: SnowParticle[] = [];
  private visibilityOverlay: number = 0; // 0-255 for transparency
  private shakeIntensity: number = 0;
  private windDirection: number = 0; // -1 to 1, influences particle movement
  private windIntensity: number = 0;
  
  // Weather timing
  private weatherTimer: number = 0;
  private weatherDuration: number = 1800; // 30 seconds at 60fps
  private minClearDuration: number = 600; // Minimum time between weather events
  
  constructor(p: p5, game: Game) {
    this.p = p;
    this.game = game;
    this.initializeParticles();
  }
  
  private initializeParticles(): void {
    // Create a pool of particles that will be reused
    const maxParticles = 300; // Maximum for blizzard
    for (let i = 0; i < maxParticles; i++) {
      const particle = new SnowParticle(this.p);
      this.particles.push(particle);
    }
  }
  
  public update(): void {
    // Update weather state transitions
    this.updateWeatherState();
    
    // Update active particles based on current state
    const activeParticleCount = this.getActiveParticleCount();
    for (let i = 0; i < this.particles.length; i++) {
      if (i < activeParticleCount) {
        this.particles[i].active = true;
        this.particles[i].update(this.windDirection, this.windIntensity);
      } else {
        this.particles[i].active = false;
      }
    }
    
    // Update weather timer and possibly change weather
    this.updateWeatherTimer();
  }
  
  private getActiveParticleCount(): number {
    switch (this.currentState) {
      case WeatherState.CLEAR:
        return 0;
      case WeatherState.LIGHT_SNOW:
        return Math.floor(50 + this.transitionProgress * 50);
      case WeatherState.HEAVY_SNOW:
        return Math.floor(100 + this.transitionProgress * 100);
      case WeatherState.BLIZZARD:
        return Math.floor(200 + this.transitionProgress * 100);
      default:
        return 0;
    }
  }

  private updateWeatherState(): void {
    if (this.currentState !== this.targetState || this.transitionProgress < 1) {
      // Update transition progress
      if (this.suddenTransition) {
        this.transitionProgress = 1; // Immediate change
      } else {
        this.transitionProgress = Math.min(1, this.transitionProgress + this.transitionSpeed);
      }
      
      // When transition completes, update current state
      if (this.transitionProgress >= 1) {
        this.currentState = this.targetState;
        this.transitionProgress = 0;
        this.suddenTransition = false;
      }
      
      // Update visual effects based on transition
      this.updateVisualEffects();
    }
  }
  
  private updateVisualEffects(): void {
    // Calculate overlay opacity based on state and transition
    let targetOpacity = 0;
    switch (this.targetState) {
      case WeatherState.CLEAR: targetOpacity = 0; break;
      case WeatherState.LIGHT_SNOW: targetOpacity = 40; break;
      case WeatherState.HEAVY_SNOW: targetOpacity = 100; break;
      case WeatherState.BLIZZARD: targetOpacity = 180; break;
    }
    
    let currentOpacity = 0;
    switch (this.currentState) {
      case WeatherState.CLEAR: currentOpacity = 0; break;
      case WeatherState.LIGHT_SNOW: currentOpacity = 40; break;
      case WeatherState.HEAVY_SNOW: currentOpacity = 100; break;
      case WeatherState.BLIZZARD: currentOpacity = 180; break;
    }
    
    // Blend between current and target opacity
    this.visibilityOverlay = currentOpacity + (targetOpacity - currentOpacity) * this.transitionProgress;
    
    // Update shake intensity
    let targetShake = this.targetState === WeatherState.BLIZZARD ? 5 : 0;
    let currentShake = this.currentState === WeatherState.BLIZZARD ? 5 : 0;
    this.shakeIntensity = currentShake + (targetShake - currentShake) * this.transitionProgress;
    
    // Update wind effects
    const maxWind = this.targetState === WeatherState.BLIZZARD ? 1.0 : 
                    this.targetState === WeatherState.HEAVY_SNOW ? 0.6 : 
                    this.targetState === WeatherState.LIGHT_SNOW ? 0.3 : 0.1;
                    
    this.windDirection = Math.sin(this.p.frameCount * 0.01) * 0.5;
    this.windIntensity = maxWind;
  }
  
  private updateWeatherTimer(): void {
    this.weatherTimer++;
    
    // Check if we should change weather
    if (this.weatherTimer > this.weatherDuration) {
      if (this.currentState === WeatherState.CLEAR && this.weatherTimer > this.minClearDuration) {
        // Chance to start weather event
        if (Math.random() < 0.1) {
          this.changeWeather();
        }
      } else if (this.currentState !== WeatherState.CLEAR && this.targetState !== WeatherState.CLEAR) {
        // Weather events eventually return to clear
        // But only if we're not already transitioning to clear
        this.setWeatherState(WeatherState.CLEAR, false);
        // Reset timer to avoid continuous attempts to change state
        this.weatherTimer = 0;
        // Set a shorter duration for clear weather
        this.weatherDuration = 1200 + Math.random() * 600; // 20-30 seconds of clear weather
        console.debug("Weather event ending, returning to clear weather");
      }
    }
  }
  
  public changeWeather(): void {
    // Randomly select a new weather state
    const states = [WeatherState.LIGHT_SNOW, WeatherState.HEAVY_SNOW];
    
    // Add blizzard as a possibility with lower chance
    if (Math.random() < 0.3) {
      states.push(WeatherState.BLIZZARD);
    }
    
    const newState = states[Math.floor(Math.random() * states.length)];
    const sudden = Math.random() < 0.2; // 20% chance of sudden weather change
    
    this.setWeatherState(newState, sudden);
    this.weatherTimer = 0;
    this.weatherDuration = 600 + Math.random() * 1200; // 10-30 seconds
  }
  
  public setWeatherState(state: WeatherState, sudden: boolean = false): void {
    this.targetState = state;
    this.suddenTransition = sudden;
    if (sudden) {
      // For sudden transitions, skip most of the transition animation
      this.transitionProgress = 0.8;
    } else {
      this.transitionProgress = 0;
    }
    
    console.log(`Weather changing to: ${WeatherState[state]}, sudden: ${sudden}`);
  }
  
  public render(): void {
    // Apply camera shake if needed
    if (this.shakeIntensity > 0) {
      this.p.push();
      this.p.translate(
        this.p.random(-this.shakeIntensity, this.shakeIntensity),
        this.p.random(-this.shakeIntensity, this.shakeIntensity)
      );
    }
    
    // Render snow particles
    for (const particle of this.particles) {
      if (particle.active) {
        particle.render();
      }
    }
    
    if (this.shakeIntensity > 0) {
      this.p.pop();
    }
    
    // Apply visibility overlay
    if (this.visibilityOverlay > 0) {
      this.renderVisibilityOverlay();
    }
  }
  
  private renderVisibilityOverlay(): void {
    // Create gradient overlay that gets more opaque toward the bottom
    this.p.push();
    this.p.noStroke();
    
    // Top to bottom linear gradient
    for (let y = 0; y < this.p.height; y += 20) {
      const alpha = this.visibilityOverlay * (y / this.p.height * 1.5);
      this.p.fill(255, 255, 255, alpha);
      this.p.rect(0, y, this.p.width, 20);
    }
    
    this.p.pop();
  }
  
  public getCurrentWeatherState(): WeatherState {
    return this.currentState;
  }
  
  public getVisibilityFactor(): number {
    // Return a value from 0 to 1 representing how much visibility is reduced
    return this.visibilityOverlay / 255;
  }
}