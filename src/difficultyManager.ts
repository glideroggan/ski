import { Game } from './game';
import { WeatherState } from './weather/weatherSystem';

/**
 * Manages game difficulty settings that affect various gameplay aspects:
 * - Player speed
 * - Obstacle density
 * - Weather conditions
 */
export class DifficultyManager {
  private game: Game;
  
  // Difficulty level from 0 to 100
  private difficultyLevel: number = 50; // Start at medium difficulty
  private targetDifficultyLevel: number = 50; // Target difficulty level for smooth transitions
  private difficultyTransitionSpeed: number = 0.05; // How quickly difficulty changes (0-1)
  private minDifficultyLevel: number = 30; // Minimum allowed difficulty level
  
  // For gradual difficulty increase over time
  private gameTimer: number = 0;
  private difficultyIncreaseRate: number = 0.0002; // Reduced from 0.0005
  private maxAutoDifficulty: number = 75; // Lowered from 85 to leave room for real difficulty
  
  // Speed settings
  private baseSpeed: number = 4; // Default speed (same as the original maxPlayerMovement)
  private maxSpeedMultiplier: number = 2.0; // Maximum speed multiplier at 100% difficulty
  
  // Track sections with different speeds
  private trackSections: TrackSection[] = [];
  private currentSectionIndex: number = -1;
  
  // Section change settings
  private sectionChangeCounter: number = 0;
  private sectionChangeDuration: number = 600; // 10 seconds at 60fps
  
  constructor(game: Game) {
    this.game = game;
    this.initializeTrackSections();
  }
  
  /**
   * Initialize predefined track sections with different speeds
   */
  private initializeTrackSections(): void {
    // Create some varied track sections
    this.trackSections = [
      { speedMultiplier: 0.8, duration: 600, name: "Easy Slope" },  // Slow section
      { speedMultiplier: 1.0, duration: 600, name: "Normal Slope" }, // Normal speed
      { speedMultiplier: 1.3, duration: 450, name: "Steep Slope" },  // Fast section
      { speedMultiplier: 1.5, duration: 300, name: "Very Steep" },   // Very fast section
      { speedMultiplier: 0.7, duration: 300, name: "Flat Area" }     // Slow down area
    ];
    
    // Set initial section
    this.selectRandomSection();
  }
  
  /**
   * Update difficulty manager state
   */
  public update(): void {
    // Smooth transition between current and target difficulty
    if (this.difficultyLevel !== this.targetDifficultyLevel) {
      // Gradually move current difficulty toward target
      const diff = this.targetDifficultyLevel - this.difficultyLevel;
      this.difficultyLevel += diff * this.difficultyTransitionSpeed;
      
      // If we're very close to target, snap to it
      if (Math.abs(diff) < 0.1) {
        this.difficultyLevel = this.targetDifficultyLevel;
      }
    }
    
    // Gradual difficulty increase over time
    this.gameTimer++;
    const autoDifficultyIncrease = this.gameTimer * this.difficultyIncreaseRate;
    if (autoDifficultyIncrease < this.maxAutoDifficulty) {
      this.setDifficultyLevel(this.targetDifficultyLevel + autoDifficultyIncrease);
    }
    
    // Update section timers
    if (this.currentSectionIndex >= 0) {
      this.sectionChangeCounter++;
      
      // Check if it's time to change sections
      const currentSection = this.trackSections[this.currentSectionIndex];
      if (this.sectionChangeCounter >= currentSection.duration) {
        this.selectRandomSection();
      }
    }
    
    // Sync weather system with difficulty level
    // Only update occasionally to prevent constant weather changes
    if (Math.random() < 0.005) { // About once every 200 frames (~3.3 seconds at 60fps)
      this.syncWeatherWithDifficulty();
    }
  }
  
  /**
   * Sync weather conditions with the difficulty level
   * Instead of directly setting weather based on difficulty,
   * this just increases the chance of weather changes at higher difficulty
   */
  private syncWeatherWithDifficulty(): void {
    const currentWeather = this.game.weatherSystem.getCurrentWeatherState();
    
    // Only consider changing weather if currently clear
    if (currentWeather === WeatherState.CLEAR) {
      // Higher difficulty = higher chance of weather changes
      // Scale from 5% at low difficulty to 20% at high difficulty
      const weatherChangeChance = 0.05 + (this.difficultyLevel / 100) * 0.15;
      
      // Random chance to start weather event
      if (Math.random() < weatherChangeChance) {
        console.log(`Random weather event triggered (${(weatherChangeChance * 100).toFixed(1)}% chance at difficulty ${this.difficultyLevel})`);
        this.game.weatherSystem.changeWeather();
      }
    }
  }
  
  /**
   * Randomly select a new track section
   */
  private selectRandomSection(): void {
    // Choose a new section different from the current one
    let newIndex = this.currentSectionIndex;
    while (newIndex === this.currentSectionIndex) {
      newIndex = Math.floor(Math.random() * this.trackSections.length);
    }
    
    this.currentSectionIndex = newIndex;
    this.sectionChangeCounter = 0;
    
    if (this.game.debug) {
      console.debug(`New track section: ${this.trackSections[newIndex].name}`);
    }
  }
  
  /**
   * Get the current speed multiplier based on difficulty and track section
   */
  public getSpeedMultiplier(): number {
    // Base multiplier from difficulty level (0-100%)
    const difficultyMultiplier = 0.5 + (this.difficultyLevel / 100) * 1.5;
    
    // Get current track section multiplier
    const sectionMultiplier = this.currentSectionIndex >= 0 ? 
      this.trackSections[this.currentSectionIndex].speedMultiplier : 1.0;
    
    return difficultyMultiplier * sectionMultiplier;
  }
  
  /**
   * Get the base player speed value
   */
  public getBaseSpeed(): number {
    return this.baseSpeed;
  }
  
  /**
   * Get current player speed value adjusted for difficulty
   */
  public getPlayerSpeed(): number {
    return this.baseSpeed * this.getSpeedMultiplier();
  }
  
  /**
   * Set difficulty level (0-100)
   */
  public setDifficultyLevel(level: number): void {
    // Clamp value between min-100
    this.targetDifficultyLevel = Math.max(this.minDifficultyLevel, Math.min(100, level));
  }
  
  /**
   * Set target difficulty level with immediate effect
   * Used for initialization and resets
   */
  public setImmediateDifficultyLevel(level: number): void {
    this.targetDifficultyLevel = Math.max(this.minDifficultyLevel, Math.min(100, level));
    this.difficultyLevel = this.targetDifficultyLevel;
  }
  
  /**
   * Increase difficulty level
   */
  public increaseDifficulty(amount: number = 5): void {
    this.setDifficultyLevel(this.targetDifficultyLevel + amount);
  }
  
  /**
   * Decrease difficulty level, but not below minimum
   */
  public decreaseDifficulty(amount: number = 5): void {
    this.setDifficultyLevel(this.targetDifficultyLevel - amount);
  }
  
  /**
   * Get current difficulty level (0-100)
   * This returns the base difficulty level set by the player
   */
  public getBaseDifficultyLevel(): number {
    return this.difficultyLevel;
  }

  /**
   * Get target difficulty level that we're transitioning to
   */
  public getTargetDifficultyLevel(): number {
    return this.targetDifficultyLevel;
  }

  /**
   * Get current effective difficulty level (0-100)
   * This factors in terrain type, player speed and weather conditions for a more accurate representation
   */
  public getDifficultyLevel(): number {
    // Start with the base difficulty level
    let effectiveDifficulty = this.difficultyLevel;
    
    // Add terrain section influence (±15%)
    const sectionBonus = this.getCurrentSectionDifficultyFactor();
    effectiveDifficulty += sectionBonus;
    
    // Add weather influence (0-20%)
    const weatherState = this.game.weatherSystem.getCurrentWeatherState();
    switch (weatherState) {
      case WeatherState.BLIZZARD:
        effectiveDifficulty += 20;
        break;
      case WeatherState.HEAVY_SNOW:
        effectiveDifficulty += 15;
        break;
      case WeatherState.LIGHT_SNOW:
        effectiveDifficulty += 7;
        break;
      default:
        // No weather bonus for clear weather
        break;
    }

    // Add player speed influence (if player exists and has speed data)
    if (this.game.player) {
      const baseSpeed = this.getPlayerSpeed();
      const actualSpeed = this.game.player.getCurrentSpeed();
      
      // Calculate how much faster the player is going than the base speed
      if (actualSpeed > baseSpeed) {
        const speedFactor = (actualSpeed - baseSpeed) / baseSpeed;
        // Add up to 30% extra difficulty based on player speed
        const speedDifficultyBonus = Math.min(30, Math.round(speedFactor * 30));
        effectiveDifficulty += speedDifficultyBonus;
      }
    }
    
    // Clamp to 0-100 range
    return Math.max(0, Math.min(100, Math.round(effectiveDifficulty)));
  }
  
  /**
   * Get the difficulty factor contribution from the current terrain section
   * Returns a value from -15 to +15 representing how the terrain affects difficulty
   */
  private getCurrentSectionDifficultyFactor(): number {
    if (this.currentSectionIndex < 0) {
      return 0;
    }
    
    const section = this.trackSections[this.currentSectionIndex];
    
    // Map speed multiplier to a difficulty bonus
    // <0.8 = easier (-15)
    // 0.8-1.2 = neutral (0)
    // >1.2 = harder (+15)
    if (section.speedMultiplier < 0.8) {
      return -15; // Easy sections reduce difficulty
    } else if (section.speedMultiplier > 1.2) {
      return 15;  // Steep sections increase difficulty
    } else {
      return 0;   // Normal sections don't affect difficulty
    }
  }
  
  /**
   * Get the name of the current track section
   */
  public getCurrentSectionName(): string {
    if (this.currentSectionIndex < 0) {
      return "Unknown Section";
    }
    return this.trackSections[this.currentSectionIndex].name;
  }
  
  /**
   * Get the weather state recommended for the current difficulty level
   */
  public getRecommendedWeatherState(): WeatherState {
    // Higher difficulty = worse weather
    if (this.difficultyLevel >= 80) {
      return WeatherState.BLIZZARD;
    } else if (this.difficultyLevel >= 60) {
      return WeatherState.HEAVY_SNOW;
    } else if (this.difficultyLevel >= 30) {
      return WeatherState.LIGHT_SNOW;
    } else {
      return WeatherState.CLEAR;
    }
  }
  
  /**
   * Get the progress through the current section (0-1)
   */
  public getSectionProgress(): number {
    if (this.currentSectionIndex < 0) {
      return 0;
    }
    
    const currentSection = this.trackSections[this.currentSectionIndex];
    return this.sectionChangeCounter / currentSection.duration;
  }
}

interface TrackSection {
  speedMultiplier: number;
  duration: number; // In frames
  name: string;
}