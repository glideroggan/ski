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

    // Blend between current and target opacity with a delay for fog effect
    // Fog should appear after the snow starts - wait until transition is 30% complete
    // before starting to fade in the fog
    const fogDelay = 0.3; // Start fog after snow is 30% in
    let fogTransitionProgress = 0;
    if (this.transitionProgress > fogDelay) {
      // Rescale the remaining 70% of the transition to be 0-100% for the fog
      fogTransitionProgress = (this.transitionProgress - fogDelay) / (1 - fogDelay);
    }

    // Use the delayed fog progress for the visibility overlay
    this.visibilityOverlay = currentOpacity + (targetOpacity - currentOpacity) * fogTransitionProgress;

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
    // Get current difficulty level to influence weather selection
    const difficultyLevel = this.game.difficultyManager.getBaseDifficultyLevel();

    // Choose weather state based on difficulty
    let newState: WeatherState;

    if (difficultyLevel >= 85) {
      // At very high difficulty, high chance of blizzard
      newState = Math.random() < 0.7 ? WeatherState.BLIZZARD : WeatherState.HEAVY_SNOW;
    } else if (difficultyLevel >= 70) {
      // At high difficulty, mostly heavy snow with chance of blizzard
      const rand = Math.random();
      if (rand < 0.3) {
        newState = WeatherState.BLIZZARD;
      } else if (rand < 0.9) {
        newState = WeatherState.HEAVY_SNOW;
      } else {
        newState = WeatherState.LIGHT_SNOW;
      }
    } else if (difficultyLevel >= 50) {
      // At medium difficulty, mix of heavy and light snow
      newState = Math.random() < 0.6 ? WeatherState.HEAVY_SNOW : WeatherState.LIGHT_SNOW;
    } else {
      // At low difficulty, mostly light snow
      newState = WeatherState.LIGHT_SNOW;
    }

    // Determine if the change is sudden based on difficulty (more sudden at higher difficulty)
    const sudden = Math.random() < (0.1 + difficultyLevel / 100 * 0.3); // 10-40% chance

    this.setWeatherState(newState, sudden);
    this.weatherTimer = 0;

    // Weather duration is shorter at higher difficulties
    const maxDuration = Math.max(300, 1500 - (difficultyLevel * 10));
    this.weatherDuration = 300 + Math.random() * maxDuration;

    console.debug(`Weather changing to: ${WeatherState[newState]}, sudden: ${sudden}, duration: ${this.weatherDuration.toFixed(0)} frames, difficulty: ${difficultyLevel.toFixed(0)}%`);
  }

  public setWeatherState(state: WeatherState, sudden: boolean = false): void {
    this.targetState = state;
    this.suddenTransition = sudden;
    if (sudden) {
      // For sudden transitions, speed up the transition but don't skip too much
      // This ensures visual effects like fog have time to fade in smoothly
      this.transitionProgress = 0.3; // Start at 30% progress instead of 80%
      this.transitionSpeed = 0.02; // Faster transition speed for sudden changes
    } else {
      this.transitionProgress = 0;
      this.transitionSpeed = 0.005; // Normal transition speed
    }

    console.debug(`Weather changing to: ${WeatherState[state]}, sudden: ${sudden}`);
  }

  public render(): void {
    // Skip weather rendering in debug mode if desired
    if (this.game.debug) {
      // Only render minimal weather effects in debug mode to keep visibility high
      this.renderMinimalDebugWeather();
      return;
    }
    
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

  /**
   * Renders a minimal version of the weather effects for debug mode
   * This preserves the weather state but reduces visual obstruction
   */
  private renderMinimalDebugWeather(): void {
    // Render a small indicator of current weather state in the corner
    this.p.push();
    this.p.fill(0, 0, 0, 120);
    this.p.rect(this.p.width - 120, 10, 110, 25);
    this.p.fill(255);
    this.p.textAlign(this.p.LEFT, this.p.TOP);
    this.p.text(`Weather: ${WeatherState[this.currentState]}`, this.p.width - 115, 15);
    this.p.pop();
    
    // Render a few particles (max 20) just to indicate weather
    const maxParticles = Math.min(20, this.getActiveParticleCount());
    for (let i = 0; i < maxParticles; i++) {
      if (this.particles[i].active) {
        this.particles[i].render();
      }
    }
    
    // Skip the visibility overlay entirely in debug mode
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