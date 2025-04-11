# Description
Create a silly ski game
It is for kids and can be silly and fun
The game area should scroll itself and player controls the character to left and right
Can also increase their speed by pressing down

# BUGS
- ✔️put back heightmap rotation, so it looks more "bumpy"
- menu showing distance covered needs adjustments, we should calculate meter better
- menu showing number of crashes, which is not needed
- skiier left falling is offsetted badly in the sprite
- UI Text is blurry
- wrong color of jacket on skier 2
- wrong color on hat and jacket on skier 3

# TODO
- switch to use shaders and webGL
- fix the little face in the corner that can react to things happening in the game
  - need to generate the faces
    - idle
    - happy
    - sad
    - angry
    - surprised
    - scared
- choose between silly characters
  - image up to the left corner of the screen
    - should react to different things happening in the game
- obstacles
    - other skiers
    - other things 
      - poop
      - yellow snow
- rewards


# To implement

# Improvements to weather changes
Advanced Implementation Ideas
Weather Zones: Create regions on the map with different typical weather patterns
Weather Warning System: Visual/audio cues before weather changes
Special Equipment: Allow player to find and use items like goggles to improve visibility in storms

## FEATURES


## IDEAS
### Map progression
- once you finsh the first slope on the mountain, you will see a map of your progression, which will show additional slopes...
  - 🔧develop the idea
### Gameplay Mechanics
Ski Jump Ramps: Allow players to perform jumps and tricks for bonus points
Different Snow Types: Add ice patches (faster, less control) and deep powder (slower, more control)
Multiple Paths: Fork the ski run into easy/hard paths with different rewards
### Progression & Variety
Increasing Difficulty: Start with simple obstacles, gradually add more complex patterns
Day/Night Cycles: Skiing at night requires lanterns or glowing obstacles
Mountain Zones: Different themed areas (forest, village, mountain peak)
Difficulty Scaling: Weather could change more frequently as the game progresses, increasing the challenge
### Interactive Elements
#### Power-ups:
Hot chocolate: Speed boost
Helmet: Temporary protection from one collision
Magnet: Attracts nearby collectibles
#### Collectibles: Coins, stars, or silly items like lost mittens
### Fun Additions
Animal Friends: Birds that fly alongside or squirrels that cheer
Secret Easter Eggs: Hidden paths or surprise characters
Silly Physics: Exaggerated crash animations or bouncy snow piles
Avalanche Chase Scenes: Occasional "run from the avalanche" segments



## Later
- Concentrate on tablet mode first
  - thumb places for tablet mode



## Assets
- obstacle sprites
  - ✔️snowman
  - ✔️tree
  - ✔️rock
  - ✔️other skiers
  - other things 
    - poop
    - yellow snow
  - rewards
    - points for collecting items


## Tech
- ✔️p5.js
  - ✔️will use a spritesheet with the character animations
  - ✔️can probably use a different sheet for all the obstacles
- ✔️typescript